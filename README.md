# kpix

Performance management platform split into `backend/` (FastAPI, PostgreSQL) and `frontend/` (React + Vite, noir & blanc).

## Start everything
- Assurez-vous qu’un PostgreSQL est accessible (driver async : `postgresql+asyncpg://...`).
- `./start.sh` applique les migrations, lit `backend/.env` et `frontend/.env` si présents, démarre l’API sur `BACKEND_PORT` (défaut 8000) et le frontend sur `FRONTEND_PORT` (défaut 5173).
- Ports configurables dans les `.env` :
  - `backend/.env` : `BACKEND_PORT`, `DATABASE_URL`, `JWT_SECRET_KEY`, `LOG_LEVEL`, `LLM_MODE`, etc.
  - `frontend/.env` : `FRONTEND_PORT`, `VITE_API_BASE_URL`, `VITE_USE_DEMO_DATA`, etc.
- `start.sh` dérive automatiquement `VITE_API_BASE_URL` (`http://localhost:${BACKEND_PORT}/api/v1`) et renseigne `CORS_ORIGINS` pour le backend à partir de `FRONTEND_PORT` afin d’éviter les erreurs de CORS.
- API docs (par défaut) : `http://localhost:8000/api/docs`. Frontend (par défaut) : `http://localhost:5173`.
- Créez un premier compte admin après le démarrage :  
  `curl -X POST http://localhost:8000/api/v1/auth/signup -H "Content-Type: application/json" -d '{"email":"admin@kpix.test","password":"changeme123","full_name":"Admin","organization_name":"Kpix"}'`

## Backend (FastAPI)
- Code and tooling live in `backend/`. Stack: FastAPI, async SQLAlchemy, Alembic, JWT auth, PostgreSQL.
- Plan: `backend/planbackend.md`.
- Quickstart:
  1. `cd backend`
  2. Copie `backend/.env.example` en `.env` puis ajuste (exemple ci-dessous) :
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
- La page détail KPI affiche un graphique d'évolution en ligne (line chart) au lieu d'un histogramme, avec les points affichés dans l'ordre chronologique (du plus ancien au plus récent, de gauche à droite).
- Lors de l’ajout d’une valeur, l’utilisateur saisit une seule date (le backend gère la période complète en fonction de la fréquence du KPI).
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
