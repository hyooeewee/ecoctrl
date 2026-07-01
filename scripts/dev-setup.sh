#!/bin/bash
set -e

# ==========================================
# dev-setup.sh — 本地开发依赖（PostgreSQL + MinIO）
# ==========================================
# 容器不存在则创建，已停止则启动，运行中则跳过。
# ==========================================

POSTGRES_IMAGE="postgres:16-alpine"
POSTGRES_PORT="5432"
POSTGRES_DB="ecoctrl"
POSTGRES_USER="ecoctrl"
POSTGRES_PASS="ecoctrl_secret"

MINIO_IMAGE="minio/minio"
MINIO_PORT_API="9000"
MINIO_PORT_CONSOLE="9001"
MINIO_USER="ecoctrl"
MINIO_PASS="ecoctrl_secret"

# ------------------------------------------------------------------
check_container() {
  local name="$1"
  local status
  status=$(docker inspect --format='{{.State.Status}}' "$name" 2>/dev/null || echo "absent")

  case "$status" in
    "running")
      echo "  ✓ $name  已运行，跳过"
      return 0
      ;;
    "exited"|"paused")
      echo "  ⚡ $name  已停止，正在启动..."
      docker start "$name" > /dev/null
      echo "  ✓ $name  已启动"
      return 0
      ;;
    "absent")
      return 1
      ;;
    *)
      echo "  ⚠ $name  状态异常 ($status)，尝试重新创建..."
      docker rm -f "$name" > /dev/null 2>&1 || true
      return 1
      ;;
  esac
}

# ------------------------------------------------------------------
# PostgreSQL
# ------------------------------------------------------------------
echo ""
echo "────────────────────────────────────────"
echo "  PostgreSQL"
echo "────────────────────────────────────────"

if check_container "ecoctrl-pg"; then
  PG_JUST_CREATED=false
else
  echo "  🆕 ecoctrl-pg  不存在，正在创建..."
  docker run -d \
    --name ecoctrl-pg \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASS" \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -p "$POSTGRES_PORT:5432" \
    -v pgdata:/var/lib/postgresql/data \
    "$POSTGRES_IMAGE" > /dev/null
  echo "  ✓ ecoctrl-pg  已创建并启动"
  PG_JUST_CREATED=true
fi

# 等 PostgreSQL 就绪
echo "  ⏳ 等待 PostgreSQL 就绪..."
for i in $(seq 1 30); do
  if docker exec ecoctrl-pg pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
    echo "  ✓ PostgreSQL 就绪"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "  ✗ PostgreSQL 未能按时就绪，请检查日志：docker logs ecoctrl-pg"
    exit 1
  fi
  sleep 1
done

# 创建 vitest 测试库（幂等）
docker exec ecoctrl-pg psql -U "$POSTGRES_USER" -tc \
  "SELECT 1 FROM pg_database WHERE datname='vitest-ecoctrl'" \
  | grep -q 1 \
  || docker exec ecoctrl-pg createdb -U "$POSTGRES_USER" vitest-ecoctrl
echo "  ✓ vitest-ecoctrl 数据库已就绪"

# ------------------------------------------------------------------
# MinIO
# ------------------------------------------------------------------
echo ""
echo "────────────────────────────────────────"
echo "  MinIO"
echo "────────────────────────────────────────"

if check_container "ecoctrl-minio"; then
  :
else
  echo "  🆕 ecoctrl-minio  不存在，正在创建..."
  docker run -d \
    --name ecoctrl-minio \
    -e MINIO_ROOT_USER="$MINIO_USER" \
    -e MINIO_ROOT_PASSWORD="$MINIO_PASS" \
    -p "$MINIO_PORT_API:9000" \
    -p "$MINIO_PORT_CONSOLE:9001" \
    -v miniodata:/data \
    "$MINIO_IMAGE" server /data --console-address ":9001" > /dev/null
  echo "  ✓ ecoctrl-minio  已创建并启动"
fi

# ------------------------------------------------------------------
# 完成
# ------------------------------------------------------------------
echo ""
echo "────────────────────────────────────────"
echo "  就绪"
echo "────────────────────────────────────────"
echo "  PostgreSQL : 127.0.0.1:$POSTGRES_PORT  (db: $POSTGRES_DB, user: $POSTGRES_USER)"
echo "  MinIO API  : http://127.0.0.1:$MINIO_PORT_API"
echo "  MinIO 管理 : http://127.0.0.1:$MINIO_PORT_CONSOLE"
echo ""
