# Knowledge Risk Mapper UI

React + Vite + TypeScript frontend for the Knowledge Risk Mapper FastAPI backend.

## Run locally

From this directory:

```bash
npm install
cp .env.example .env
npm run dev
```

The UI runs at `http://localhost:5173` and expects the backend at `http://localhost:8000`. Change `VITE_API_BASE_URL` in `.env` when the backend is deployed elsewhere.

For a production build:

```bash
npm run build
npm run preview
```

The generated static files are in `dist/` and can be served by any static host.

## Backend expectations

The UI consumes the Knowledge Risk Mapper FastAPI endpoints:

- `POST /api/analyze`
- `GET /api/status/{job_id}`
- `GET /api/results/{job_id}`
- `GET /api/results/{job_id}/file/{file_id}`
- `GET /api/results/{job_id}/summary`
- `POST /api/simulate`
- `GET /api/health`

The backend must have CORS enabled for the UI origin. The included backend already allows cross-origin browser requests.