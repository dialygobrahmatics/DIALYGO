#!/usr/bin/env bash
# Start / stop the whole DialyGo stack under pm2, after checking its dependencies.
#
#   ./start.sh            start (default): check databases, then start backend + frontend
#   ./start.sh stop       stop and remove the pm2 processes
#   ./start.sh restart    restart both processes (use after backend code changes)
#   ./start.sh status     show pm2 status and database checks
#
# Services: PostgreSQL (required), MongoDB (documents/OCR), FastAPI backend, React frontend.
# First-time setup of the Python venv is done by ./start-backend.sh.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
export BACKEND_PORT="${BACKEND_PORT:-8000}"
export FRONTEND_PORT="${FRONTEND_PORT:-3000}"
APPS=(dialygo-backend dialygo-frontend)

ok()   { printf '  \033[32m✔\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✘\033[0m %s\n' "$*"; }
die()  { fail "$*"; exit 1; }

env_value() { grep -E "^$1=" "$BACKEND_DIR/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' || true; }
is_local()  { [[ "$1" == *localhost* || "$1" == *127.0.0.1* ]]; }
port_in_use() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

wait_for() { # wait_for <seconds> <command...>
  local secs=$1; shift
  for _ in $(seq "$secs"); do "$@" >/dev/null 2>&1 && return 0; sleep 1; done
  return 1
}

check_tools() {
  echo "Tools"
  command -v pm2  >/dev/null || die "pm2 not found (npm i -g pm2)"
  command -v node >/dev/null || die "node not found"
  ok "pm2 $(pm2 --version), node $(node --version)"
  [ -x "$BACKEND_DIR/.venv/bin/python3" ] || die "backend venv missing - run ./start-backend.sh once to create it"
  [ -f "$BACKEND_DIR/.env" ] || die "backend/.env missing - run ./start-backend.sh once to create it"
  [ -d "$ROOT_DIR/frontend/node_modules" ] || die "frontend deps missing - run: cd frontend && npm install"
  ok "backend venv, backend/.env and frontend node_modules present"
  command -v tesseract >/dev/null || warn "tesseract not on PATH - OCR will not work (brew install tesseract)"
}

check_postgres() {
  local url host port
  url="$(env_value DATABASE_URL)"
  [ -n "$url" ] || die "DATABASE_URL is not set in backend/.env"
  [[ "$url" =~ @([^:/?]+)(:([0-9]+))?/ ]] || die "could not parse host from DATABASE_URL"
  host="${BASH_REMATCH[1]}"; port="${BASH_REMATCH[3]:-5432}"
  command -v pg_isready >/dev/null || { warn "pg_isready not installed - skipping PostgreSQL check"; return 0; }

  if pg_isready -q -h "$host" -p "$port"; then ok "PostgreSQL is accepting connections ($host:$port)"; return 0; fi
  if is_local "$host" && command -v brew >/dev/null; then
    warn "PostgreSQL not running - starting via brew services"
    brew services start postgresql@16 >/dev/null 2>&1 || true
    wait_for 20 pg_isready -q -h "$host" -p "$port" && { ok "PostgreSQL started ($host:$port)"; return 0; }
  fi
  die "PostgreSQL is not reachable at $host:$port"
}

check_mongo() {
  local url
  url="$(env_value MONGO_URL)"
  [ -n "$url" ] || { warn "MONGO_URL is not set - document/OCR features will fail"; return 0; }
  if is_local "$url"; then
    if ! pgrep -x mongod >/dev/null && command -v brew >/dev/null && brew list --formula 2>/dev/null | grep -q '^mongodb-community'; then
      warn "MongoDB not running - starting via brew services"
      brew services start mongodb-community >/dev/null 2>&1 || true
      wait_for 20 nc -z localhost 27017
    fi
    nc -z localhost 27017 >/dev/null 2>&1 && ok "MongoDB is accepting connections (localhost:27017)" \
      || warn "MongoDB not reachable on localhost:27017 - document/OCR features will fail (login still works)"
  elif command -v mongosh >/dev/null; then
    local sep="?"; [[ "$url" == *\?* ]] && sep="&"
    if mongosh "${url}${sep}serverSelectionTimeoutMS=8000" --quiet --eval 'db.runCommand({ping:1}).ok' >/dev/null 2>&1; then
      ok "MongoDB (remote) responded to ping"
    else
      warn "remote MongoDB did not respond - document/OCR features will fail (login still works)"
    fi
  else
    warn "remote MongoDB not checked (mongosh not installed)"
  fi
}

check_ports() {
  local app port
  for pair in "dialygo-backend:$BACKEND_PORT" "dialygo-frontend:$FRONTEND_PORT"; do
    app="${pair%%:*}"; port="${pair##*:}"
    if port_in_use "$port" && ! pm2 pid "$app" 2>/dev/null | grep -qE '^[0-9]+$'; then
      local pid; pid="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN | head -1)"
      fail "port $port (needed by $app) is held by PID $pid: $(ps -o command= -p "$pid" | cut -c1-70)"
      fail "  cwd: $(lsof -a -p "$pid" -d cwd -Fn | sed -n 's/^n//p')"
      die "free the port, or pick others: BACKEND_PORT=8001 FRONTEND_PORT=3001 ./start.sh"
    fi
  done
  ok "ports $BACKEND_PORT and $FRONTEND_PORT are free or already ours"
}

http_up() { curl -fs -o /dev/null --max-time 2 "$1"; }

start_stack() {
  check_tools; echo "Databases"; check_postgres; check_mongo; echo "Ports"; check_ports
  echo "Starting with pm2"
  pm2 startOrRestart "$ROOT_DIR/ecosystem.config.js" --update-env >/dev/null || die "pm2 failed to start the apps"

  echo "Waiting for services"
  wait_for 40 http_up "http://127.0.0.1:$BACKEND_PORT/api/health" \
    && ok "backend  http://127.0.0.1:$BACKEND_PORT/api/health" \
    || fail "backend not healthy - check: pm2 logs dialygo-backend"
  wait_for 120 http_up "http://127.0.0.1:$FRONTEND_PORT" \
    && ok "frontend http://localhost:$FRONTEND_PORT" \
    || fail "frontend not responding yet - check: pm2 logs dialygo-frontend"
  echo; pm2 status
  echo; echo "Logs: pm2 logs   |   Stop: ./start.sh stop   |   Restart: ./start.sh restart"
}

case "${1:-start}" in
  start)   start_stack ;;
  stop)    pm2 delete "${APPS[@]}" 2>/dev/null; echo "Stopped." ;;
  restart) pm2 restart "${APPS[@]}" --update-env ;;
  status)  check_postgres; check_mongo; pm2 status ;;
  *) echo "Usage: $0 [start|stop|restart|status]"; exit 1 ;;
esac
