#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

if [ -f "$BACKEND_DIR/.env" ]; then
  set -a
  . "$BACKEND_DIR/.env"
  set +a
fi

BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}
DATABASE_URL=${DATABASE_URL:-postgresql+asyncpg://postgres:postgres@localhost:5432/kpix}
JWT_SECRET_KEY=${JWT_SECRET_KEY:-dev-secret}
LOG_LEVEL=${LOG_LEVEL:-INFO}
LLM_MODE=${LLM_MODE:-api}
API_BASE_URL=${VITE_API_BASE_URL:-http://localhost:${BACKEND_PORT}/api/v1}
VITE_USE_DEMO_DATA=${VITE_USE_DEMO_DATA:-false}

if [[ "$DATABASE_URL" != postgresql+asyncpg://* ]]; then
  echo "DATABASE_URL doit utiliser le driver asyncpg (ex: postgresql+asyncpg://user:pass@localhost:5432/kpix)." >&2
  exit 1
fi

echo "API base URL: ${API_BASE_URL}"
echo "DATABASE_URL: ${DATABASE_URL}"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 est requis pour démarrer kpix." >&2
    exit 1
  fi
}

require uv
require npm

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
  VITE_API_BASE_URL="$API_BASE_URL" VITE_USE_DEMO_DATA="$VITE_USE_DEMO_DATA" npm run dev -- --host --port "$FRONTEND_PORT"
) &
frontend_pid=$!

echo "Backend: http://localhost:${BACKEND_PORT}/api/docs"
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "Arrêtez avec Ctrl+C."

wait_any() {
  while true; do
    if ! kill -0 "$backend_pid" 2>/dev/null; then
      wait "$backend_pid" 2>/dev/null || true
      break
    fi
    if ! kill -0 "$frontend_pid" 2>/dev/null; then
      wait "$frontend_pid" 2>/dev/null || true
      break
    fi
    sleep 1
  done
}

wait_any
