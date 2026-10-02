#!/usr/bin/env bash
# Sets up and starts the DialyGo backend (FastAPI) locally. See README.md.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"

case "${OSTYPE:-$(uname -s | tr '[:upper:]' '[:lower:]')}" in
  msys*|mingw*|cygwin*) PLATFORM=windows ;;
  darwin*) PLATFORM=macos ;;
  *) echo "ERROR: This launcher supports Windows Git Bash and macOS only." >&2; exit 1 ;;
esac

if [[ -n "${PYTHON_BIN:-}" ]]; then
  BASE_PYTHON="$PYTHON_BIN"
elif [[ "$PLATFORM" == windows ]]; then
  BASE_PYTHON=python
else
  BASE_PYTHON=
  for candidate in python3.12 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then BASE_PYTHON="$candidate"; break; fi
  done
fi
if [[ -z "$BASE_PYTHON" ]] || ! command -v "$BASE_PYTHON" >/dev/null 2>&1; then
  if [[ "$PLATFORM" == macos ]]; then
    echo "ERROR: Python 3.12 or python3 was not found. Install Python 3.12 (Homebrew is supported on macOS)." >&2
  else
    echo "ERROR: Python was not found on PATH. Install Python and enable the Python launcher." >&2
  fi
  exit 1
fi

BASE_VERSION="$($BASE_PYTHON -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
if ! "$BASE_PYTHON" -c 'import sys; raise SystemExit(sys.version_info < (3, 10))'; then
  echo "ERROR: Python 3.10 or newer is required (found $BASE_VERSION)." >&2
  exit 1
fi

if [[ "$PLATFORM" == windows ]]; then
  VENV_PYTHON="$BACKEND_DIR/.venv/Scripts/python.exe"
else
  VENV_PYTHON="$BACKEND_DIR/.venv/bin/python"
fi

# Use the managed interpreter directly; an activated shell venv cannot redirect pip or the server.
RECREATE_VENV=false
if [[ -e "$BACKEND_DIR/.venv" ]]; then
  if [[ ! -x "$VENV_PYTHON" ]] || ! VENV_VERSION="$("$VENV_PYTHON" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null)"; then
    RECREATE_VENV=true
  elif [[ "$VENV_VERSION" != "$BASE_VERSION" ]] \
    || ! "$VENV_PYTHON" -c 'import sys; raise SystemExit(sys.prefix == sys.base_prefix)' >/dev/null 2>&1 \
    || ! "$VENV_PYTHON" -m pip --version >/dev/null 2>&1; then
    RECREATE_VENV=true
  fi
fi
if [[ "$RECREATE_VENV" == true ]]; then
  echo "==> Recreating backend/.venv for Python $BASE_VERSION"
  rm -rf "$BACKEND_DIR/.venv"
fi
if [[ ! -x "$VENV_PYTHON" ]]; then
  echo "==> Creating backend/.venv"
  "$BASE_PYTHON" -m venv "$BACKEND_DIR/.venv"
fi

STAMP="$BACKEND_DIR/.venv/.requirements.sha256"
CURRENT_SHA="$("$BASE_PYTHON" -c 'import hashlib,sys; print(hashlib.sha256(open(sys.argv[1], "rb").read()).hexdigest())' "$BACKEND_DIR/requirements.txt")"
if [[ ! -f "$STAMP" ]] || [[ "$(cat "$STAMP")" != "$CURRENT_SHA" ]]; then
  echo "==> Installing backend requirements"
  "$VENV_PYTHON" -m pip install --upgrade pip
  "$VENV_PYTHON" -m pip install -r "$BACKEND_DIR/requirements.txt"
  printf '%s\n' "$CURRENT_SHA" > "$STAMP"
fi

# The application uses python-dotenv; never interpret .env as shell input.
if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "==> Creating backend/.env with local defaults (edit as needed)"
  cat > "$BACKEND_DIR/.env" <<'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=dialygo
DATABASE_URL=postgresql+asyncpg://dialygo@localhost:5432/dialygo
EOF
fi

cd "$BACKEND_DIR"

# Keep an existing .env untouched, while supplying the documented local SQL default if it omits DATABASE_URL.
DATABASE_URL="$("$VENV_PYTHON" -c 'import os; from dotenv import dotenv_values; print(os.environ.get("DATABASE_URL") or dotenv_values(".env").get("DATABASE_URL") or "postgresql+asyncpg://dialygo@localhost:5432/dialygo")')"
export DATABASE_URL

# Check actual database authentication and database selection using the configured URLs.
MONGO_URL_VALUE="$("$VENV_PYTHON" -c 'from dotenv import dotenv_values; print(dotenv_values(".env").get("MONGO_URL", ""))')"
if ! "$VENV_PYTHON" - <<'PY'
import asyncio
import os
from dotenv import dotenv_values
import asyncpg
from sqlalchemy.engine import make_url

async def check():
    url = make_url(os.environ.get("DATABASE_URL") or dotenv_values(".env").get("DATABASE_URL", ""))
    conn = await asyncpg.connect(host=url.host or "localhost", port=url.port or 5432,
                                 user=url.username, password=url.password,
                                 database=url.database or "postgres", timeout=3)
    try:
        await conn.fetchval("SELECT current_database()")
    finally:
        await conn.close()
try:
    asyncio.run(check())
except Exception as exc:
    print("WARNING: PostgreSQL connection/authentication failed for the configured DATABASE_URL (details: %s). Check that PostgreSQL is installed, running, and the configured role/database are valid." % type(exc).__name__)
    raise SystemExit(1)
print("==> PostgreSQL connection and configured database verified")
PY
then
  if [[ "$PLATFORM" == macos ]] && command -v brew >/dev/null 2>&1; then
    DATABASE_URL_VALUE="$DATABASE_URL"
    if [[ "$DATABASE_URL_VALUE" == *localhost* || "$DATABASE_URL_VALUE" == *127.0.0.1* ]]; then
      PG_FORMULA=
      for formula in postgresql@16 postgresql; do
        if brew list --formula "$formula" >/dev/null 2>&1; then PG_FORMULA="$formula"; break; fi
      done
      if [[ -n "$PG_FORMULA" ]]; then
        echo "==> Trying Homebrew PostgreSQL service: $PG_FORMULA"
        brew services start "$PG_FORMULA" >/dev/null || true
        sleep 3
        "$VENV_PYTHON" - <<'PY' || true
import asyncio
import os
from dotenv import dotenv_values
import asyncpg
from sqlalchemy.engine import make_url
u=make_url(os.environ.get("DATABASE_URL") or dotenv_values(".env").get("DATABASE_URL", ""))
async def check():
 c=await asyncpg.connect(host=u.host or "localhost",port=u.port or 5432,user=u.username,password=u.password,database=u.database or "postgres",timeout=3); await c.close()
try: asyncio.run(check()); print("==> PostgreSQL is reachable")
except Exception as e: print("WARNING: PostgreSQL is still unavailable or its configured credentials/database are invalid (%s)." % type(e).__name__)
PY
      fi
    fi
  fi
fi

if ! "$VENV_PYTHON" - <<'PY'
from dotenv import dotenv_values
from pymongo import MongoClient
from pymongo.errors import PyMongoError
v=dotenv_values(".env")
try:
 c=MongoClient(v.get("MONGO_URL", ""), serverSelectionTimeoutMS=3000)
 c.get_database(v.get("DB_NAME", "")).command("ping")
 c.close()
except PyMongoError as exc:
 print("WARNING: MongoDB connection/authentication failed for the configured MONGO_URL or DB_NAME (%s). Check that MongoDB is installed, running, and the configured credentials/database are valid." % type(exc).__name__)
 raise SystemExit(1)
print("==> MongoDB connection verified")
PY
then
  if [[ "$PLATFORM" == macos ]] \
    && [[ "$MONGO_URL_VALUE" == *localhost* || "$MONGO_URL_VALUE" == *127.0.0.1* || "$MONGO_URL_VALUE" == *'[::1]'* ]] \
    && command -v brew >/dev/null 2>&1 && brew list --formula mongodb-community >/dev/null 2>&1; then
    echo "==> Trying Homebrew MongoDB service: mongodb-community"
    brew services start mongodb-community >/dev/null || true
    sleep 3
    "$VENV_PYTHON" - <<'PY' || true
from dotenv import dotenv_values
from pymongo import MongoClient
v=dotenv_values(".env")
try:
 c=MongoClient(v.get("MONGO_URL", ""),serverSelectionTimeoutMS=3000); c.get_database(v.get("DB_NAME", "")).command("ping"); c.close(); print("==> MongoDB is reachable")
except Exception as e: print("WARNING: MongoDB is still unavailable or its configured credentials/database are invalid (%s)." % type(e).__name__)
PY
  fi
fi

if ! command -v tesseract >/dev/null 2>&1; then
  if [[ "$PLATFORM" == windows ]]; then
    echo "WARNING: Tesseract was not found on PATH; OCR will not work until the native Tesseract executable is installed and added to PATH."
  else
    echo "WARNING: Tesseract was not found on PATH; OCR will not work. Install it with Homebrew (brew install tesseract) or another macOS package manager."
  fi
fi

echo "==> Starting backend at http://$HOST:$PORT (health: /api/health)"
exec "$VENV_PYTHON" -m uvicorn server:app --reload --host "$HOST" --port "$PORT"
