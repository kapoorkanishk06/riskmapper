# Knowledge Risk Mapper

Knowledge Risk Mapper is a backend-only FastAPI service that mines a public GitHub repository's history to find bus-factor risk, then creates a practical knowledge-transfer plan for the riskiest files.

## Run locally

Python 3.11+ is recommended.

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Optional: enables Claude explanations. Without it, deterministic fallback
# explanations are generated so the rest of the analysis still works.
export ANTHROPIC_API_KEY="your-key"

uvicorn main:app --reload
```

The API is available at `http://localhost:8000`. Interactive OpenAPI documentation is at `/docs`.

SQLite is created automatically as `knowledge_risk_mapper.db`. Set `DATABASE_URL` to use a different SQLite path.

## Run with Docker

Build and start the service with Docker Compose:

```bash
export ANTHROPIC_API_KEY="your-key"   # optional; fallbacks work without it
docker compose up --build -d
```

The API is then available at `http://localhost:8000`. SQLite is persisted in the `knowledge-risk-data` Docker volume. To stop the service:

```bash
docker compose down
```

To use a different host port, set `PORT` before starting. The container continues to listen on port 8000:

```bash
PORT=8080 docker compose up --build -d
```

The `Dockerfile` installs Git inside the image because repository ingestion clones public GitHub repositories at runtime. Pass `ANTHROPIC_API_KEY` only at runtime; it is not copied into the image.

## Endpoints

### Start an analysis

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"repo_url":"https://github.com/psf/requests","months":12}'
```

The response contains a `job_id`. Analysis runs in a background worker because cloning, Git history mining, and AI calls may take time.

### Poll status

```bash
curl http://localhost:8000/api/status/JOB_ID
```

Status progresses through `queued`, `cloning`, `mining`, `ai_analysis`, and `completed` (or `failed`). The `progress` field is an approximate 0–100 value.

### Read ranked results

```bash
curl "http://localhost:8000/api/results/JOB_ID?page=1&page_size=25"
curl http://localhost:8000/api/results/JOB_ID/summary
curl http://localhost:8000/api/results/JOB_ID/file/FILE_ID
```

The result list is sorted by `final_risk_score` descending. The summary includes the average repo-wide knowledge risk score, files above 70, and the riskiest file. The file detail endpoint includes Claude's summary, impact narrative, onboarding draft, and pairing suggestion for the top ten files.

### Simulate a contributor leaving

Pass either the contributor's display name or email:

```bash
curl -X POST http://localhost:8000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"job_id":"JOB_ID","contributor":"Jane Developer"}'
```

The response lists affected files, the number that become orphaned, a criticality-weighted impact score, and a human-readable summary.

### Health

```bash
curl http://localhost:8000/api/health
```

## Analysis model

For each source file, the deterministic miner calculates:

- **Ownership concentration (40%)**: author share of changed lines, with each commit retaining a minimum contribution of one point.
- **Recency decay (20%)**: days since the latest file commit, reaching 100 at 180 days. Files beyond that threshold are marked `zombie_ownership`.
- **Criticality (40%)**: normalized count of other source files that appear to import or reference the target module.

The three normalized scores are combined into `final_risk_score` from 0 to 100. The weights are intentionally exposed as `RISK_WEIGHTS` in `git_analysis.py` for easy tuning.

The clone uses up to 500 commits. Source files, binary files, lockfiles, generated/build folders, `node_modules`, `vendor`, and common virtual-environment folders are excluded. Public GitHub repositories only are supported in this MVP; private repositories and authentication tokens are intentionally out of scope.

## Project layout

```text
Dockerfile        production container image
docker-compose.yml Docker Compose deployment configuration
main.py          FastAPI app and REST routes
git_analysis.py  deterministic Git mining and risk scoring
ai_analysis.py   Claude calls, JSON parsing, and fallback explanations
models.py        SQLAlchemy tables and Pydantic API models
database.py      SQLite engine/session setup
requirements.txt pinned runtime dependencies
```
