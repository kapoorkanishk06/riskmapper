"""Database tables and Pydantic request/response models."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, HttpUrl
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    repo_url: Mapped[str] = mapped_column(Text, nullable=False)
    months: Mapped[int] = mapped_column(Integer, nullable=False, default=12)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued")
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    files: Mapped[list["FileAnalysis"]] = relationship(
        back_populates="job", cascade="all, delete-orphan", order_by="FileAnalysis.final_risk_score.desc()"
    )


class FileAnalysis(Base):
    __tablename__ = "file_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    primary_owner: Mapped[str] = mapped_column(String(320), nullable=False, default="Unknown")
    primary_owner_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    concentration_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    days_since_last_commit: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    criticality_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    final_risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    commit_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lines_changed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    zombie_ownership: Mapped[bool] = mapped_column(nullable=False, default=False)
    contributors_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    imports_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    plain_english_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    impact_narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    explainer_doc_draft: Mapped[str | None] = mapped_column(Text, nullable=True)
    pairing_suggestion: Mapped[str | None] = mapped_column(Text, nullable=True)

    job: Mapped[Job] = relationship(back_populates="files")


# API request models
class AnalyzeRequest(BaseModel):
    repo_url: HttpUrl
    months: int = Field(default=12, ge=1, le=60, description="Commit history window in months")


class SimulateRequest(BaseModel):
    job_id: str = Field(min_length=1)
    contributor: str = Field(min_length=1, max_length=320)


# API response models
class AnalyzeResponse(BaseModel):
    job_id: str
    status: str
    message: str


class JobStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: str
    repo_url: str
    months: int
    status: str
    progress: int
    message: str | None = None
    error: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class ContributorShare(BaseModel):
    name: str
    email: str | None = None
    percentage: float


class FileResult(BaseModel):
    id: int
    filename: str
    primary_owner: str
    primary_owner_email: str | None = None
    concentration_score: float
    days_since_last_commit: int
    criticality_score: float
    final_risk_score: float
    commit_count: int
    lines_changed: int
    zombie_ownership: bool
    contributors: list[ContributorShare]


class FileDetail(FileResult):
    imports: list[str]
    plain_english_summary: str | None = None
    impact_narrative: str | None = None
    explainer_doc_draft: str | None = None
    pairing_suggestion: str | None = None


class ResultsResponse(BaseModel):
    job_id: str
    total: int
    page: int
    page_size: int
    files: list[FileResult]


class SummaryResponse(BaseModel):
    job_id: str
    total_files_analyzed: int
    critical_risk_files: int
    knowledge_risk_score: float
    riskiest_file: FileResult | None = None


class AffectedFile(BaseModel):
    id: int
    filename: str
    risk_score: float
    criticality_score: float
    impact_narrative: str | None = None


class SimulationResponse(BaseModel):
    job_id: str
    contributor: str
    affected_files: list[AffectedFile]
    orphaned_file_count: int
    criticality_weighted_impact_score: float
    summary: str


class HealthResponse(BaseModel):
    status: str
    service: str
    ai_enabled: bool


def json_load(value: str, fallback: Any) -> Any:
    """Decode one of the JSON text columns without allowing bad data to break an API response."""
    import json

    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return fallback