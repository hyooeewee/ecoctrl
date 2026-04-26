#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

# Built-in defaults for the front-end proxy. Overridden, in order:
#   1. shell env (e.g. `API_BASE_URL=... ./start.sh`)  ← highest
#   2. <app>/.env.local                                 ← per-app override
#   3. $ROOT/.env.local                                 ← shared fallback (optional)
#   4. these defaults                                   ← lowest
DEFAULT_API_BASE_URL="http://localhost:3000"
DEFAULT_API_PREFIX="/api"
DEFAULT_STATIC_PREFIX="/static"

# Source one or more env files in order; later files override earlier ones.
# Missing files are silently skipped.
load_env() {
  for f in "$@"; do
    if [[ -f "$f" ]]; then
      set -a
      # shellcheck disable=SC1090
      source "$f"
      set +a
    fi
  done
}

ADMIN_PORT="${ADMIN_PORT:-4173}"
WEB_PORT="${WEB_PORT:-8081}"
PM2_APP="ecoctrl-server"
PM2_CONFIG="ecoctrl.config.cjs"

# ---------- helpers ----------
is_pid_alive() {
  local f="$1"
  [[ -f "$f" ]] && kill -0 "$(cat "$f")" 2>/dev/null
}

is_pm2_online() {
  npx --yes pm2 jlist 2>/dev/null | grep -q "\"name\":\"$PM2_APP\""
}

# Start a SPA bundle on $port serving $dir. Client bundles always issue requests
# against fixed /api and /static prefixes; lws rewrites them onto the real backend
# at ${API_BASE_URL}${API_PREFIX|STATIC_PREFIX}, so backend host or path-prefix
# moves only require editing .env.local. Note: \$1 is escaped so lws — not bash —
# sees the capture group.
lws_serve() {
  local dir="$1" port="$2" log="$3" pidfile="$4"
  npx --yes local-web-server \
    --port "$port" \
    --directory "$dir" \
    --spa index.html \
    --rewrite "/api/(.*) -> ${API_BASE_URL}${API_PREFIX}/\$1" \
    --rewrite "/static/(.*) -> ${API_BASE_URL}${STATIC_PREFIX}/\$1" \
    > "$log" 2>&1 &
  echo $! > "$pidfile"
}

# ---------- start ----------
# Each app starts in a subshell so that per-app env vars (loaded from
# <app>/.env.local) don't leak into siblings.
start_admin() (
  load_env "$ROOT/.env.local" "$ROOT/admin/.env.local"
  API_BASE_URL="${API_BASE_URL:-$DEFAULT_API_BASE_URL}"
  API_PREFIX="${API_PREFIX:-$DEFAULT_API_PREFIX}"
  STATIC_PREFIX="${STATIC_PREFIX:-$DEFAULT_STATIC_PREFIX}"
  echo "Starting admin on :$ADMIN_PORT (proxy ${API_PREFIX} ${STATIC_PREFIX} -> ${API_BASE_URL}) ..."
  lws_serve "$ROOT/admin" "$ADMIN_PORT" "$LOG_DIR/admin.log" "$LOG_DIR/admin.pid"
)

start_web() (
  load_env "$ROOT/.env.local" "$ROOT/web/.env.local"
  API_BASE_URL="${API_BASE_URL:-$DEFAULT_API_BASE_URL}"
  API_PREFIX="${API_PREFIX:-$DEFAULT_API_PREFIX}"
  STATIC_PREFIX="${STATIC_PREFIX:-$DEFAULT_STATIC_PREFIX}"
  echo "Starting web on :$WEB_PORT (proxy ${API_PREFIX} ${STATIC_PREFIX} -> ${API_BASE_URL}) ..."
  lws_serve "$ROOT/web" "$WEB_PORT" "$LOG_DIR/web.log" "$LOG_DIR/web.pid"
)

start_server() {
  echo "Preparing server ..."

  echo "Installing server dependencies ..."
  (cd "$ROOT/server" && npm install --omit=dev)

  # pm2 inherits cwd, so node + dotenv inside the server reads server/.env.local automatically.
  echo "Starting server via pm2 ($PM2_CONFIG) ..."
  (cd "$ROOT/server" && npx --yes pm2 startOrRestart "$PM2_CONFIG")
}

start_all() {
  start_admin
  start_web
  start_server
  echo "----------------------------------------"
  echo "admin : http://localhost:$ADMIN_PORT   (log: $LOG_DIR/admin.log)"
  echo "web   : http://localhost:$WEB_PORT     (log: $LOG_DIR/web.log)"
  echo "server: npx pm2 status"
}

# ---------- stop ----------
stop_admin() {
  if is_pid_alive "$LOG_DIR/admin.pid"; then
    echo "Stopping admin (pid $(cat "$LOG_DIR/admin.pid")) ..."
    kill "$(cat "$LOG_DIR/admin.pid")" 2>/dev/null || true
  fi
  rm -f "$LOG_DIR/admin.pid"
}

stop_web() {
  if is_pid_alive "$LOG_DIR/web.pid"; then
    echo "Stopping web (pid $(cat "$LOG_DIR/web.pid")) ..."
    kill "$(cat "$LOG_DIR/web.pid")" 2>/dev/null || true
  fi
  rm -f "$LOG_DIR/web.pid"
}

stop_server() {
  if is_pm2_online; then
    echo "Stopping server (pm2 delete $PM2_APP) ..."
    npx --yes pm2 delete "$PM2_APP" 2>/dev/null || true
  fi
}

stop_all() {
  stop_admin
  stop_web
  stop_server
}

# ---------- main ----------
running=()
is_pid_alive "$LOG_DIR/admin.pid" && running+=("admin")
is_pid_alive "$LOG_DIR/web.pid"   && running+=("web")
is_pm2_online                     && running+=("server")

if [[ ${#running[@]} -eq 0 ]]; then
  start_all
  exit 0
fi

echo "Already running: ${running[*]}"
echo "  [r] restart"
echo "  [s] stop"
echo "  [q] cancel  (default)"
read -r -p "Choose [r/s/q]: " choice

case "${choice:-q}" in
  r|R) stop_all; echo; start_all ;;
  s|S) stop_all ;;
  q|Q) echo "Canceled." ;;
  *)   echo "Unknown choice: $choice" ; exit 1 ;;
esac
