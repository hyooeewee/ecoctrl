#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

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

# ---------- start ----------
start_admin() {
  echo "Starting admin on :$ADMIN_PORT ..."
  pnpm dlx serve "$ROOT/admin" -l "$ADMIN_PORT" --single \
    > "$LOG_DIR/admin.log" 2>&1 &
  echo $! > "$LOG_DIR/admin.pid"
}

start_web() {
  echo "Starting web on :$WEB_PORT ..."
  pnpm dlx serve "$ROOT/web" -l "$WEB_PORT" --single \
    > "$LOG_DIR/web.log" 2>&1 &
  echo $! > "$LOG_DIR/web.pid"
}

start_server() {
  echo "Preparing server ..."

  echo "Installing server dependencies ..."
  (cd "$ROOT/server" && pnpm install --prod)

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
