"""Deterministic Git history mining for repository knowledge risk."""

from __future__ import annotations

import mimetypes
import os
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable

from git import Repo

# Keep these weights in one place so the risk model can be tuned during the demo.
RISK_WEIGHTS = {
    "ownership_concentration": 0.40,
    "recency_decay": 0.20,
    "criticality": 0.40,
}
ZOMBIE_DAYS = 180
MAX_FILE_BYTES = 300_000
SOURCE_EXTENSIONS = {
    ".c", ".cc", ".cpp", ".cs", ".css", ".go", ".h", ".hpp", ".html", ".java",
    ".js", ".jsx", ".json", ".kt", ".m", ".mm", ".php", ".py", ".rb", ".rs",
    ".scss", ".sh", ".sql", ".swift", ".ts", ".tsx", ".vue", ".xml", ".yaml", ".yml",
}
IGNORED_PARTS = {
    ".git", ".hg", ".svn", "node_modules", "vendor", "bower_components", "dist",
    "build", "coverage", ".next", ".nuxt", "target", "__pycache__", ".venv", "venv",
}
IGNORED_FILENAMES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "composer.lock",
    "Gemfile.lock", "Cargo.lock", "go.sum", "Podfile.lock",
}


@dataclass
class MinedFile:
    filename: str
    primary_owner: str
    primary_owner_email: str | None
    concentration_score: float
    days_since_last_commit: int
    criticality_score: float
    final_risk_score: float
    commit_count: int
    lines_changed: int
    zombie_ownership: bool
    contributors: list[dict]
    imports: list[str]
    content: str
    adjacent_authors: list[str]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _commit_datetime(commit) -> datetime:
    return datetime.fromtimestamp(commit.committed_date, tz=timezone.utc)


def is_source_path(path: str) -> bool:
    parts = Path(path).parts
    if any(part in IGNORED_PARTS for part in parts):
        return False
    name = Path(path).name
    if name in IGNORED_FILENAMES or name.startswith("."):
        return False
    return Path(path).suffix.lower() in SOURCE_EXTENSIONS


def _is_binary(path: Path) -> bool:
    try:
        sample = path.read_bytes()[:8192]
    except OSError:
        return True
    return b"\x00" in sample


def _author_key(commit) -> tuple[str, str | None]:
    actor = commit.author
    return actor.name or actor.email or "Unknown", actor.email


def _relative_source_files(repo: Repo) -> list[str]:
    files: list[str] = []
    root = Path(repo.working_tree_dir or ".")
    for path in repo.git.ls_files().splitlines():
        if not path or not is_source_path(path):
            continue
        disk_path = root / path
        if disk_path.is_file() and not _is_binary(disk_path) and disk_path.stat().st_size <= MAX_FILE_BYTES:
            files.append(path)
    return files


def _read_content(repo: Repo, filename: str) -> str:
    path = Path(repo.working_tree_dir or ".") / filename
    try:
        return path.read_text(encoding="utf-8", errors="replace")[:MAX_FILE_BYTES]
    except OSError:
        return ""


def _reference_count(content: str, target: str) -> bool:
    """A deliberately small, language-agnostic import/reference heuristic."""
    stem = Path(target).stem
    if stem in {"index", "main"}:
        # These names are too common to identify a module by themselves.
        candidates = [Path(target).as_posix(), Path(target).with_suffix("").as_posix()]
    else:
        candidates = [stem, Path(target).with_suffix("").as_posix(), Path(target).as_posix()]
    escaped = "|".join(re.escape(candidate) for candidate in candidates if candidate)
    pattern = re.compile(
        rf"(?:\b(?:import|from|require|include|use)\b[^;\n]*?(?:{escaped})|"
        rf"""["'][^"']*(?:{escaped})[^"']*["']\s*\)?\s*;?)""",
        re.IGNORECASE,
    )
    return bool(pattern.search(content))


def _criticality(files: list[str], contents: dict[str, str]) -> dict[str, int]:
    references: dict[str, int] = {}
    for target in files:
        references[target] = sum(
            1 for source, content in contents.items() if source != target and _reference_count(content, target)
        )
    return references


def _contributors_for_file(repo: Repo, filename: str, cutoff: datetime) -> tuple[Counter, dict, datetime | None, int, list[str]]:
    contributions: Counter = Counter()
    identities: dict = {}
    latest: datetime | None = None
    commit_count = 0
    all_authors: set[str] = set()
    try:
        commits = repo.iter_commits(paths=filename)
        for commit in commits:
            when = _commit_datetime(commit)
            name, email = _author_key(commit)
            all_authors.add(name)
            if latest is None or when > latest:
                latest = when
            if when < cutoff:
                break
            commit_count += 1
            try:
                stats = commit.stats.files.get(filename, {})
                lines = int(stats.get("insertions", 0)) + int(stats.get("deletions", 0))
            except (TypeError, ValueError):
                lines = 0
            # One point preserves commit ownership even for merge/metadata-only changes.
            contributions[name] += max(1, lines)
            identities[name] = email
    except Exception:
        # A malformed path or shallow history should not discard the rest of a repository.
        pass
    return contributions, identities, latest, commit_count, sorted(all_authors)


def mine_repository(repo: Repo, months: int, progress: Callable[[int, str], None] | None = None) -> list[MinedFile]:
    cutoff = _utc_now() - timedelta(days=months * 30)
    files = _relative_source_files(repo)
    if progress:
        progress(20, f"Found {len(files)} source files")
    contents = {filename: _read_content(repo, filename) for filename in files}
    references = _criticality(files, contents)
    max_references = max(references.values(), default=0)
    results: list[MinedFile] = []
    authors_by_file: dict[str, list[str]] = {}

    for index, filename in enumerate(files):
        contributions, identities, latest, commit_count, all_authors = _contributors_for_file(repo, filename, cutoff)
        if not contributions:
            # A shallow clone can have no commits inside the requested window. Use the
            # available historical ownership rather than presenting a falsely safe file.
            historical_cutoff = datetime.min.replace(tzinfo=timezone.utc)
            contributions, identities, latest, commit_count, all_authors = _contributors_for_file(
                repo, filename, historical_cutoff
            )
        authors_by_file[filename] = all_authors
        total = sum(contributions.values())
        primary_owner = contributions.most_common(1)[0][0] if contributions else "Unknown"
        primary_email = identities.get(primary_owner)
        concentration = (contributions.get(primary_owner, 0) / total * 100) if total else 0
        days_since = max(0, (_utc_now() - latest).days) if latest else 9999
        recency_score = min(100.0, days_since / ZOMBIE_DAYS * 100)
        criticality = (references[filename] / max_references * 100) if max_references else 0
        final_risk = (
            concentration * RISK_WEIGHTS["ownership_concentration"]
            + recency_score * RISK_WEIGHTS["recency_decay"]
            + criticality * RISK_WEIGHTS["criticality"]
        )
        contributor_rows = [
            {"name": name, "email": identities.get(name), "percentage": round(value / total * 100, 2)}
            for name, value in contributions.most_common()
        ] if total else []
        adjacent = sorted(set(all_authors) - {primary_owner})
        results.append(
            MinedFile(
                filename=filename,
                primary_owner=primary_owner,
                primary_owner_email=primary_email,
                concentration_score=round(concentration, 2),
                days_since_last_commit=days_since,
                criticality_score=round(criticality, 2),
                final_risk_score=round(final_risk, 2),
                commit_count=commit_count,
                lines_changed=sum(contributions.values()),
                zombie_ownership=days_since > ZOMBIE_DAYS,
                contributors=contributor_rows,
                imports=[name for name, count in references.items() if name != filename and _reference_count(contents.get(name, ""), filename)][:50],
                content=contents[filename],
                adjacent_authors=adjacent,
            )
        )
        if progress and files:
            progress(20 + int((index + 1) / len(files) * 55), f"Analyzed {index + 1}/{len(files)} files")
    # Pairing candidates should be people who know nearby code, not just people
    # who touched the same file. Same-directory files and explicit import
    # neighbors are a useful, language-agnostic approximation for the MVP.
    for item in results:
        related_files = {
            other for other in files
            if other != item.filename
            and (
                Path(other).parent == Path(item.filename).parent
                or other in item.imports
                or _reference_count(contents.get(other, ""), item.filename)
            )
        }
        related_authors = {
            author for other in related_files for author in authors_by_file.get(other, [])
            if author != item.primary_owner
        }
        item.adjacent_authors = sorted(related_authors) or [
            author for author in authors_by_file.get(item.filename, []) if author != item.primary_owner
        ]
    return sorted(results, key=lambda item: item.final_risk_score, reverse=True)