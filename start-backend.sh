#!/usr/bin/env bash
# Sets up and starts the DialyGo backend (FastAPI) locally. See README.md.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"

cd "$BACKEND_DIR"

# 1. Python 3.10+
PYTHON_BIN="${PYTHON_BIN:-python3.12}"
command -v "$PYTHON_BIN" >/dev/null \
  || { echo "$PYTHON_BIN not found. Install with: brew install python@3.12"; exit 1; }
WANT_VERSION="$("$PYTHON_BIN" -c 'import sys; print("%d.%d" % sys.version_info[:2])')"

# 2. Virtual environment (recreated if built with a different Python version)
if [ -x .venv/bin/python ] \
  && [ "$(.venv/bin/python -c 'import sys; print("%d.%d" % sys.version_info[:2])')" != "$WANT_VERSION" ]; then
  echo "==> Recreating virtual environment for Python $WANT_VERSION"
  rm -rf .venv
fi
if [ ! -d .venv ]; then
  echo "==> Creating virtual environment"
  "$PYTHON_BIN" -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

# 3. Dependencies (reinstall only when requirements.txt changes)
STAMP=".venv/.requirements.sha"
CURRENT_SHA="$(shasum requirements.txt | cut -d' ' -f1)"
if [ ! -f "$STAMP" ] || [ "$(cat "$STAMP")" != "$CURRENT_SHA" ]; then
  echo "==> Installing dependencies"
  python -m pip install --upgrade pip
  python -m pip install -r requirements.txt
  echo "$CURRENT_SHA" > "$STAMP"
fi

# 4. .env (MONGO_URL and DB_NAME are required by the app)
if [ ! -f .env ]; then
  echo "==> Creating backend/.env with local defaults (edit as needed)"
  cat > .env <<'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=dialygo
DATABASE_URL=postgresql+asyncpg://dialygo:dialygo@localhost:5432/dialygo
EOF
fi

# 5. PostgreSQL (relational store). Local installs only; a remote DATABASE_URL is left alone.
DATABASE_URL_VALUE="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)"
if [[ "$DATABASE_URL_VALUE" == *localhost* || "$DATABASE_URL_VALUE" == *127.0.0.1* ]]; then
  PG_BIN="$(brew --prefix postgresql@16 2>/dev/null || true)/bin"
  if [ -x "$PG_BIN/pg_isready" ] && ! "$PG_BIN/pg_isready" -q; then
    echo "==> Starting PostgreSQL via brew services"
    brew services start postgresql@16 >/dev/null || true
    sleep 3
  fi
fi

# 6. MongoDB (required for documents/OCR data)
MONGO_URL_VALUE="$(grep -E '^MONGO_URL=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)"
if [[ "$MONGO_URL_VALUE" == *localhost* || "$MONGO_URL_VALUE" == *127.0.0.1* ]]; then
  if ! pgrep -x mongod >/dev/null; then
    if command -v brew >/dev/null && brew list --formula 2>/dev/null | grep -q '^mongodb-community'; then
      echo "==> Starting MongoDB via brew services"
      brew services start mongodb-community >/dev/null || true
      sleep 3
    elif command -v mongod >/dev/null; then
      echo "==> Starting mongod in the background"
      mkdir -p "$BACKEND_DIR/.mongo-data"
      mongod --dbpath "$BACKEND_DIR/.mongo-data" --fork \
        --logpath "$BACKEND_DIR/.mongo-data/mongod.log" >/dev/null
    else
      echo "WARNING: MongoDB not found locally; install it or point MONGO_URL at a running instance."
    fi
  fi
fi

# 7. Tesseract (only needed for OCR)
command -v tesseract >/dev/null \
  || echo "WARNING: tesseract not on PATH (OCR will not work). Install with: brew install tesseract"

# 8. Start the server (applies Alembic migrations on startup)
echo "==> Starting backend at http://$HOST:$PORT (health: /api/health)"
exec python -m uvicorn server:app --reload --host "$HOST" --port "$PORT"
