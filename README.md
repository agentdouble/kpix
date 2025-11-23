# kpix

Performance management platform split into `backend/` (FastAPI, PostgreSQL) and `frontend/` (React + Vite, noir & blanc).

## Start everything
- `./script.sh` lance PostgreSQL (docker, port 5433), applique les migrations, démarre l’API sur 8000 et le frontend sur 5173.
- Variables ajustables : `BACKEND_PORT`, `FRONTEND_PORT`, `DB_PORT`, `DATABASE_URL`, `VITE_API_BASE_URL` (défaut `http://localhost:8000/api/v1`), `SKIP_DB_BOOT=1` si une base existe déjà.
- API docs : `http://localhost:8000/api/docs`. Frontend : `http://localhost:5173`.
- Créez un premier compte admin après le démarrage :  
  `curl -X POST http://localhost:8000/api/v1/auth/signup -H "Content-Type: application/json" -d '{"email":"admin@kpix.test","password":"changeme123","full_name":"Admin","organization_name":"Kpix"}'`

## Backend (FastAPI)
- Code and tooling live in `backend/`. Stack: FastAPI, async SQLAlchemy, Alembic, JWT auth, PostgreSQL.
- Plan: `backend/planbackend.md`.
- Quickstart:
  1. `cd backend`
  2. Crée un `.env` :
     ```
     DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/kpix
     JWT_SECRET_KEY=change-me
     ACCESS_TOKEN_EXPIRES_MINUTES=30
     REFRESH_TOKEN_EXPIRES_MINUTES=10080
     LOG_LEVEL=INFO
     LLM_MODE=api  # ou local pour un runtime vLLM
     ```
  3. Installer les deps : `uv sync`
  4. Migrations : `uv run alembic upgrade head`
  5. Démarrer l’API : `uv run uvicorn kpix_backend.main:app --reload --host 0.0.0.0 --port 8000`
  6. Docs : `/api/docs` quand le serveur tourne.
- Tests backend : `cd backend && uv run --extra dev pytest`

## Frontend (React + Vite)
- Tech stack : React + TypeScript + Vite, design noir & blanc, pages Login / Dashboards / KPI détail / Overview / Imports.
- Plan : `frontend/planfrontend.md`.
- Quickstart (depuis `frontend/`) :
  - `npm install`
  - `VITE_API_BASE_URL=http://localhost:8000/api/v1 npm run dev` pour utiliser l’API
  - `VITE_USE_DEMO_DATA=true npm run dev` pour le mode démo sans backend
- Docs : `frontend/README.md`.

## Development notes
- Suivre `AGENTS.md` pour les règles de contribution.
- Gestion Python via uv (pas de pip/venv).
- Les features LLM doivent supporter les modes `local` (vLLM) et `api` (provider externe).
