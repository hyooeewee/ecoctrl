#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Building builder ==="
docker build -f Dockerfile.builder -t ghcr.io/hyooeewee/ecoctrl/builder:cache .

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
