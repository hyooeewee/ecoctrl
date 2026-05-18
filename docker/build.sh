#!/bin/bash
set -e

# Ensure we're at the repo root for consistent bake/compose paths
cd "$(dirname "$0")/.."

echo "=== Building builder ==="
docker buildx bake -f docker/docker-bake.hcl builder --load

echo "=== Building server ==="
docker compose -f docker/compose.build.yaml build server

echo "=== Building web ==="
docker compose -f docker/compose.build.yaml build web

echo "=== Building admin ==="
docker compose -f docker/compose.build.yaml build admin

echo "=== Starting services ==="
docker compose -f docker/compose.build.yaml up -d

echo "=== Done ==="
docker compose ps
