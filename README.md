# kpix

Performance management platform split into `backend/` (FastAPI, PostgreSQL) and `frontend/` (plan only for now).

## Backend (FastAPI)
- Code and tooling live in `backend/`. Stack: FastAPI, async SQLAlchemy, Alembic, JWT auth, PostgreSQL.
- Plans: see `backend/planbackend.md`.

### Quickstart
1. `cd backend`
2. Create a `.env` with the essentials:
   ```
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/kpix
   JWT_SECRET_KEY=change-me
   ACCESS_TOKEN_EXPIRES_MINUTES=30
   REFRESH_TOKEN_EXPIRES_MINUTES=10080
   LOG_LEVEL=INFO
   LLM_MODE=api  # or local when wiring a local vLLM runtime
   ```
3. Install deps with uv: `uv sync`
4. Run migrations: `uv run alembic upgrade head`
5. Start the API: `uv run uvicorn kpix_backend.main:app --reload --host 0.0.0.0 --port 8000`
6. Docs are served at `/api/docs` once the server is running.

### Tests
- Backend unit tests: `cd backend && uv run --extra dev pytest`

## Frontend
- Plan only for now: `frontend/planfrontend.md`.

## Development notes
- Follow the collaboration rules in `AGENTS.md`.
- Package management is handled with uv (no pip/venv).
- LLM usage must support both `local` (vLLM) and `api` (external provider) modes when features arrive; configuration keys are already available in `Settings`.
