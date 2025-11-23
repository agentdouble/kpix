# kpix

Initial repository setup for the kpix project. The codebase is organized into `backend/` and `frontend/` directories.

## Backend
- See `backend/planbackend.md` for the technical plan of the performance management backend (PostgreSQL, APIs, domains).

## Frontend
- Tech stack: React + TypeScript + Vite, design noir & blanc, pages Login / Dashboards / KPI détail / Overview / Imports.
- Quick start (depuis `frontend/`) :
  - `npm install`
  - `VITE_USE_DEMO_DATA=true npm run dev` pour le mode démo sans backend
  - ou définir `VITE_API_BASE_URL` puis `npm run dev` pour utiliser l’API
- Documentation détaillée : `frontend/README.md` et le plan `frontend/planfrontend.md`.

## Development notes
- Follow the guidelines in `AGENTS.md` for contributions and environment expectations.
- Use `uv` for Python package management for any Python backend code.
- Maintain separate local (vLLM) and API (external provider) modes for LLM usage if/when LLM features are introduced.
