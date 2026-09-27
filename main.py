"""Knowledge Risk Mapper REST API."""

from __future__ import annotations

import logging
import re
import shutil
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from git import GitCommandError, InvalidGitRepositoryError, Repo
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ai_analysis import explain_file
from database import SessionLocal, get_db, init_db
from git_analysis import MinedFile, mine_repository
from models import (
    AffectedFile,
    AnalyzeRequest,
    AnalyzeResponse,
    ContributorShare,
    FileAnalysis,
    FileDetail,
    FileResult,
    HealthResponse,
    Job,
    JobStatusResponse,
    ResultsResponse,
    SimulateRequest,
    SimulationResponse,
    SummaryResponse,
    json_load,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("knowledge-risk-mapper")
executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="analysis")

app = FastAPI(
    title="Knowledge Risk Mapper API",
    description="Find repository bus-factor risk and generate a knowledge-transfer plan.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()
    logger.info("Knowledge Risk Mapper API started")


def _valid_github_url(url: str) -> bool:
    return bool(re.fullmatch(r"https://(?:www\.)?github\.com/[^/\s]+/[^/\s]+(?:\.git)?/?", url))


def _update_job(job_id: str, **values) -> None:
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if job:
            for key, value in values.items():
                setattr(job, key, value)
            db.commit()
    finally:
        db.close()


def _persist_mined_file(job_id: str, item: MinedFile) -> FileAnalysis:
    import json

    return FileAnalysis(
        job_id=job_id,
        filename=item.filename,
        primary_owner=item.primary_owner,
        primary_owner_email=item.primary_owner_email,
        concentration_score=item.concentration_score,
        days_since_last_commit=item.days_since_last_commit,
        criticality_score=item.criticality_score,
        final_risk_score=item.final_risk_score,
        commit_count=item.commit_count,
        lines_changed=item.lines_changed,
        zombie_ownership=item.zombie_ownership,
        contributors_json=json.dumps(item.contributors),
        imports_json=json.dumps(item.imports),
    )


def _run_analysis(job_id: str, repo_url: str, months: int) -> None:
    temp_dir: str | None = None
    db = SessionLocal()
    try:
        _update_job(job_id, status="cloning", progress=5, message="Cloning public GitHub repository")
        temp_dir = tempfile.mkdtemp(prefix="knowledge-risk-")
        try:
            repo = Repo.clone_from(repo_url, temp_dir, depth=500, single_branch=True)
        except (GitCommandError, InvalidGitRepositoryError, OSError) as exc:
            raise RuntimeError(
                "Unable to clone repository. Check that the GitHub URL is public and that the repository exists."
            ) from exc

        _update_job(job_id, status="mining", progress=15, message="Mining Git history and source references")
        mined = mine_repository(
            repo,
            months,
            progress=lambda progress, message: _update_job(
                job_id, status="mining", progress=progress, message=message
            ),
        )
        db.add_all(_persist_mined_file(job_id, item) for item in mined)
        db.commit()
        _update_job(job_id, status="ai_analysis", progress=78, message="Generating explanations for the 10 riskiest files")

        # Only the top ten invoke Claude. If the key is absent, explain_file creates
        # useful deterministic drafts instead of making the whole job fail.
        for index, item in enumerate(mined[:10]):
            row = db.execute(
                select(FileAnalysis).where(FileAnalysis.job_id == job_id, FileAnalysis.filename == item.filename)
            ).scalar_one()
            explanation = explain_file(item)
            row.plain_english_summary = explanation["plain_english_summary"]
            row.impact_narrative = explanation["impact_narrative"]
            row.explainer_doc_draft = explanation["explainer_doc_draft"]
            row.pairing_suggestion = explanation["pairing_suggestion"]
            db.commit()
            _update_job(job_id, progress=78 + int((index + 1) / max(1, min(10, len(mined))) * 20),
                        message=f"Explained {index + 1}/{min(10, len(mined))} high-risk files")
        _update_job(job_id, status="completed", progress=100, message=f"Analysis complete: {len(mined)} files analyzed",
                    completed_at=datetime.utcnow())
        logger.info("Analysis %s completed with %s files", job_id, len(mined))
    except Exception as exc:
        logger.exception("Analysis %s failed", job_id)
        _update_job(job_id, status="failed", progress=100, message="Analysis failed", error=str(exc))
    finally:
        db.close()
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)


def _contributors(row: FileAnalysis) -> list[ContributorShare]:
    return [ContributorShare(**value) for value in json_load(row.contributors_json, [])]


def _file_result(row: FileAnalysis) -> FileResult:
    return FileResult(
        id=row.id,
        filename=row.filename,
        primary_owner=row.primary_owner,
        primary_owner_email=row.primary_owner_email,
        concentration_score=row.concentration_score,
        days_since_last_commit=row.days_since_last_commit,
        criticality_score=row.criticality_score,
        final_risk_score=row.final_risk_score,
        commit_count=row.commit_count,
        lines_changed=row.lines_changed,
        zombie_ownership=row.zombie_ownership,
        contributors=_contributors(row),
    )


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    import os

    return HealthResponse(status="ok", service="knowledge-risk-mapper", ai_enabled=bool(os.getenv("ANTHROPIC_API_KEY")))


@app.post("/api/analyze", response_model=AnalyzeResponse, status_code=202)
def analyze(request: AnalyzeRequest, db: Session = Depends(get_db)) -> AnalyzeResponse:
    repo_url = str(request.repo_url).rstrip("/")
    if not _valid_github_url(repo_url):
        raise HTTPException(
            status_code=422,
            detail="Only public GitHub repository URLs are supported, for example https://github.com/owner/repository.",
        )
    job_id = str(uuid.uuid4())
    job = Job(id=job_id, repo_url=repo_url, months=request.months, status="queued", progress=0,
              message="Analysis queued")
    db.add(job)
    db.commit()
    executor.submit(_run_analysis, job_id, repo_url, request.months)
    return AnalyzeResponse(job_id=job_id, status="queued", message="Analysis started; poll /api/status/{job_id}.")


@app.get("/api/status/{job_id}", response_model=JobStatusResponse)
def status(job_id: str, db: Session = Depends(get_db)) -> JobStatusResponse:
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found.")
    return JobStatusResponse(
        job_id=job.id, repo_url=job.repo_url, months=job.months, status=job.status,
        progress=job.progress, message=job.message, error=job.error,
        created_at=job.created_at, completed_at=job.completed_at,
    )


def _require_completed_job(job_id: str, db: Session) -> Job:
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found.")
    if job.status != "completed":
        raise HTTPException(status_code=409, detail=f"Analysis is not complete (status: {job.status}).")
    return job


@app.get("/api/results/{job_id}", response_model=ResultsResponse)
def results(
    job_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
) -> ResultsResponse:
    _require_completed_job(job_id, db)
    total = db.scalar(select(func.count(FileAnalysis.id)).where(FileAnalysis.job_id == job_id)) or 0
    rows = db.scalars(
        select(FileAnalysis).where(FileAnalysis.job_id == job_id)
        .order_by(FileAnalysis.final_risk_score.desc(), FileAnalysis.filename.asc())
        .offset((page - 1) * page_size).limit(page_size)
    ).all()
    return ResultsResponse(job_id=job_id, total=total, page=page, page_size=page_size,
                           files=[_file_result(row) for row in rows])


@app.get("/api/results/{job_id}/file/{file_id}", response_model=FileDetail)
def file_detail(job_id: str, file_id: int, db: Session = Depends(get_db)) -> FileDetail:
    _require_completed_job(job_id, db)
    row = db.scalar(select(FileAnalysis).where(FileAnalysis.job_id == job_id, FileAnalysis.id == file_id))
    if not row:
        raise HTTPException(status_code=404, detail="File analysis not found for this job.")
    result = _file_result(row)
    return FileDetail(**result.model_dump(), imports=json_load(row.imports_json, []),
                      plain_english_summary=row.plain_english_summary,
                      impact_narrative=row.impact_narrative,
                      explainer_doc_draft=row.explainer_doc_draft,
                      pairing_suggestion=row.pairing_suggestion)


@app.get("/api/results/{job_id}/summary", response_model=SummaryResponse)
def summary(job_id: str, db: Session = Depends(get_db)) -> SummaryResponse:
    _require_completed_job(job_id, db)
    rows = db.scalars(select(FileAnalysis).where(FileAnalysis.job_id == job_id)
                      .order_by(FileAnalysis.final_risk_score.desc())).all()
    critical_count = sum(row.final_risk_score > 70 for row in rows)
    risk_score = round(sum(row.final_risk_score for row in rows) / len(rows), 2) if rows else 0
    return SummaryResponse(job_id=job_id, total_files_analyzed=len(rows),
                           critical_risk_files=critical_count, knowledge_risk_score=risk_score,
                           riskiest_file=_file_result(rows[0]) if rows else None)


@app.post("/api/simulate", response_model=SimulationResponse)
def simulate(request: SimulateRequest, db: Session = Depends(get_db)) -> SimulationResponse:
    _require_completed_job(request.job_id, db)
    contributor = request.contributor.strip().lower()
    rows = db.scalars(
        select(FileAnalysis).where(FileAnalysis.job_id == request.job_id)
        .order_by(FileAnalysis.final_risk_score.desc())
    ).all()
    affected = [
        row for row in rows
        if row.primary_owner.lower() == contributor
        or (row.primary_owner_email and row.primary_owner_email.lower() == contributor)
    ]
    if not affected:
        return SimulationResponse(
            job_id=request.job_id, contributor=request.contributor, affected_files=[],
            orphaned_file_count=0, criticality_weighted_impact_score=0,
            summary=f"No files in this analysis have {request.contributor} as their primary owner.",
        )
    impact = sum(row.final_risk_score * max(row.criticality_score, 1) / 100 for row in affected)
    names = ", ".join(row.filename for row in affected[:3])
    suffix = f" and {len(affected) - 3} more" if len(affected) > 3 else ""
    return SimulationResponse(
        job_id=request.job_id, contributor=request.contributor,
        affected_files=[
            AffectedFile(id=row.id, filename=row.filename, risk_score=row.final_risk_score,
                         criticality_score=row.criticality_score, impact_narrative=row.impact_narrative)
            for row in affected
        ],
        orphaned_file_count=len(affected),
        criticality_weighted_impact_score=round(impact, 2),
        summary=(
            f"If {request.contributor} left tomorrow, {len(affected)} analyzed file(s) would lose their "
            f"primary owner. The highest-risk affected files are {names}{suffix}."
        ),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)