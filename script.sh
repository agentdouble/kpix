#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}
DB_PORT=${DB_PORT:-5433}
DB_CONTAINER_NAME=${DB_CONTAINER_NAME:-kpix-postgres}
API_BASE_URL=${VITE_API_BASE_URL:-http://localhost:${BACKEND_PORT}/api/v1}
DATABASE_URL=${DATABASE_URL:-postgresql+asyncpg://postgres:postgres@localhost:${DB_PORT}/kpix}
JWT_SECRET_KEY=${JWT_SECRET_KEY:-dev-secret}
LOG_LEVEL=${LOG_LEVEL:-INFO}
LLM_MODE=${LLM_MODE:-api}

echo "API base URL : ${API_BASE_URL}"
echo "DATABASE_URL : ${DATABASE_URL}"

if [ "${SKIP_DB_BOOT:-0}" != "1" ]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker est requis pour démarrer PostgreSQL automatiquement. Installez-le ou exportez SKIP_DB_BOOT=1 si vous avez déjà une base." >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Le démon Docker n'est pas démarré. Lancez Docker Desktop/colima ou exportez SKIP_DB_BOOT=1 pour utiliser une base existante." >&2
    exit 1
  fi

  if ! docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
    echo "Création du conteneur PostgreSQL ${DB_CONTAINER_NAME} (port ${DB_PORT})..."
    docker run -d --name "${DB_CONTAINER_NAME}" -p "${DB_PORT}:5432" \
      -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=kpix \
      postgres:16-alpine >/dev/null
  elif ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
    echo "Démarrage du conteneur PostgreSQL ${DB_CONTAINER_NAME}..."
    docker start "${DB_CONTAINER_NAME}" >/dev/null
  else
    echo "Conteneur PostgreSQL ${DB_CONTAINER_NAME} déjà démarré."
  fi

  echo "Attente de PostgreSQL..."
  ready=0
  for _ in $(seq 1 20); do
    if docker exec "${DB_CONTAINER_NAME}" pg_isready -U postgres -d kpix -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [ "$ready" -ne 1 ]; then
    echo "PostgreSQL ne répond pas. Vérifiez le conteneur ${DB_CONTAINER_NAME}." >&2
    exit 1
  fi
else
  echo "SKIP_DB_BOOT=1 défini : on suppose que DATABASE_URL est déjà accessible."
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "uv est requis (https://github.com/astral-sh/uv)." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm est requis pour lancer le frontend." >&2
  exit 1
fi

cleanup() {
  set +e
  if [ -n "${backend_pid-}" ] && ps -p "${backend_pid}" >/dev/null 2>&1; then
    kill "${backend_pid}"
  fi
  if [ -n "${frontend_pid-}" ] && ps -p "${frontend_pid}" >/dev/null 2>&1; then
    kill "${frontend_pid}"
  fi
}
trap cleanup EXIT INT TERM

(
  cd "$BACKEND_DIR"
  uv sync
  DATABASE_URL="$DATABASE_URL" JWT_SECRET_KEY="$JWT_SECRET_KEY" LOG_LEVEL="$LOG_LEVEL" LLM_MODE="$LLM_MODE" uv run alembic upgrade head
  DATABASE_URL="$DATABASE_URL" JWT_SECRET_KEY="$JWT_SECRET_KEY" LOG_LEVEL="$LOG_LEVEL" LLM_MODE="$LLM_MODE" uv run uvicorn kpix_backend.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
) &
backend_pid=$!

(
  cd "$FRONTEND_DIR"
  npm install --no-progress
  VITE_API_BASE_URL="$API_BASE_URL" VITE_USE_DEMO_DATA=false npm run dev -- --host --port "$FRONTEND_PORT"
) &
frontend_pid=$!

echo "Backend: http://localhost:${BACKEND_PORT}/api/docs"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "Arrêtez avec Ctrl+C."

wait -n "$backend_pid" "$frontend_pid"
