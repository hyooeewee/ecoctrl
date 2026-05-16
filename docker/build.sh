#!/bin/bash
set -e

cd "$(dirname "$0")"

# Auto-use linux/amd64 on macOS (ARM) since builder image is amd64-only
if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
  export DOCKER_DEFAULT_PLATFORM=linux/amd64
  echo "Detected Apple Silicon — using platform: linux/amd64"
fi

echo "=== Building postgres ==="
docker compose -f compose.build.yaml build postgres

echo "=== Building server ==="
docker compose -f compose.build.yaml build server

echo "=== Building web ==="
docker compose -f compose.build.yaml build web

echo "=== Building admin ==="
docker compose -f compose.build.yaml build admin

echo "=== Starting services ==="
docker compose -f compose.build.yaml up -d

echo "=== Done ==="
docker compose ps
