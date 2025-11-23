# kpix backend

FastAPI backend for KPI dashboards, action plans, comments, and imports.

## Run locally
1. Install deps with uv: `uv sync`
2. Migrate the database: `uv run alembic upgrade head`
3. Start the API: `uv run uvicorn kpix_backend.main:app --reload --host 0.0.0.0 --port 8000`
4. Open docs at `/api/docs`.

### Environment
Set these in `.env` before running:
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/kpix
JWT_SECRET_KEY=change-me
ACCESS_TOKEN_EXPIRES_MINUTES=30
REFRESH_TOKEN_EXPIRES_MINUTES=10080
LOG_LEVEL=INFO
LLM_MODE=api  # switch to local when a vLLM runtime is plugged in
BACKEND_PORT=8000  # utilisé par ./start.sh pour choisir le port uvicorn
```

## Migrations
- Generate schema changes with Alembic: `uv run alembic revision --autogenerate -m "message"`
- Apply: `uv run alembic upgrade head`

## Testing
- Unit tests: `uv run --extra dev pytest`

## Import format
`POST /api/v1/imports/kpi-values` accepts CSV or Excel with columns:
`kpi_id`, `period_start` (YYYY-MM-DD), optional `period_end`, `value`, optional `comment`.
