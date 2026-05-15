#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ---------- defaults ----------
MODE="load"
PLATFORM="linux/amd64"
COMPOSE_FILE="$SCRIPT_DIR/../docker/compose.yaml"
TAR_FILE="$SCRIPT_DIR/ecoctrl-images.bak"
COMPOSE_FILE_SET=""

# ---------- usage ----------
usage() {
  cat <<EOF
Migrate Docker images for offline deployment.

Usage: bash $(basename "$0") [compose-file] [OPTIONS]

Arguments:
  compose-file           Path to compose.yaml (default: ../docker/compose.yaml)

Options:
  -e, --export [tar-file]    Export images to tar file (default: ./ecoctrl-images.bak)
  -l, --load [tar-file]      Load images from tar file (default: ./ecoctrl-images.bak)
  -p, --platform <os/arch>   Target platform (default: linux/amd64)
  -h, --help             Show this help

Examples:
  # Load from default tar
  bash $(basename "$0")

  # Export with default tar path
  bash $(basename "$0") --export

  # Export with custom platform
  bash $(basename "$0") ../docker/compose.yaml --export ./ecoctrl-images.bak --platform linux/arm64
EOF
}

# ---------- helpers ----------
validate_platform() {
  local p="$1"
  if [[ ! "$p" =~ ^[a-zA-Z0-9]+/[a-zA-Z0-9_]+(/[a-zA-Z0-9_]+)?$ ]]; then
    echo "Error: invalid platform format: '$p'" >&2
    echo "Expected: os/arch or os/arch/variant (e.g., linux/amd64, linux/arm/v7)" >&2
    exit 1
  fi
}

get_images() {
  local file="$1"
  if command -v yq >/dev/null 2>&1; then
    yq '.services.*.image' "$file" | grep -v '^null$' | sed -E "s/^['\"]|['\"]$//g" | sort -u
  else
    grep -E '^[[:space:]]*image:[[:space:]]*' "$file" | sed -E 's/^[[:space:]]*image:[[:space:]]*//' | sed -E "s/^['\"]|['\"]$//g" | sort -u
  fi
}

# ---------- parse args ----------
while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--export)
      MODE="export"
      shift
      # If next arg exists, doesn't start with -, and doesn't look like a compose file
      if [[ -n "${1:-}" && ! "$1" =~ ^- && ! "$1" =~ \.(yaml|yml)$ ]]; then
        TAR_FILE="$1"
        shift
      fi
      ;;
    -l|--load)
      MODE="load"
      shift
      if [[ -n "${1:-}" && ! "$1" =~ ^- && ! "$1" =~ \.(yaml|yml)$ ]]; then
        TAR_FILE="$1"
        shift
      fi
      ;;
    -p|--platform)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --platform requires a value" >&2
        exit 1
      fi
      PLATFORM="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Error: unknown option: $1" >&2
      usage
      exit 1
      ;;
    *)
      # Positional argument: compose file
      if [[ -z "$COMPOSE_FILE_SET" ]]; then
        COMPOSE_FILE="$1"
        COMPOSE_FILE_SET=1
      else
        echo "Error: unexpected argument: $1" >&2
        usage
        exit 1
      fi
      shift
      ;;
  esac
done

# ---------- validate ----------
validate_platform "$PLATFORM"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

# Resolve to absolute path
COMPOSE_FILE="$(cd "$(dirname "$COMPOSE_FILE")" && pwd)/$(basename "$COMPOSE_FILE")"

# ---------- extract images ----------
IMAGES=$(get_images "$COMPOSE_FILE")
if [[ -z "$IMAGES" ]]; then
  echo "Error: no images found in $COMPOSE_FILE" >&2
  exit 1
fi

IMAGE_COUNT=$(echo "$IMAGES" | wc -l | tr -d ' ')
echo "Found $IMAGE_COUNT image(s) in $COMPOSE_FILE:"
echo "$IMAGES" | sed 's/^/  - /'
echo

# ---------- execute ----------
if [[ "$MODE" == "export" ]]; then
  echo "Mode: EXPORT (platform: $PLATFORM)"
  echo "Target: $TAR_FILE"
  echo

  for img in $IMAGES; do
    echo "Pulling $img (platform: $PLATFORM) ..."
    docker pull --platform "$PLATFORM" "$img"
  done

  echo
  echo "Saving images to $TAR_FILE ..."
  docker save -o "$TAR_FILE" $IMAGES

  echo
  echo "Done. Package size: $(du -h "$TAR_FILE" | cut -f1)"
  echo "Transfer this file to the offline machine and run:"
  echo "  bash $(basename "$0") --load \"$TAR_FILE\""

else
  echo "Mode: LOAD"
  echo "Source: $TAR_FILE"
  echo

  if [[ ! -f "$TAR_FILE" ]]; then
    echo "Error: tar file not found: $TAR_FILE" >&2
    exit 1
  fi

  echo "Loading images ..."
  docker load -i "$TAR_FILE"

  echo
  echo "Verifying loaded images ..."
  MISSING=()
  for img in $IMAGES; do
    if ! docker image inspect "$img" >/dev/null 2>&1; then
      MISSING+=("$img")
    fi
  done

  if [[ ${#MISSING[@]} -gt 0 ]]; then
    echo "Warning: the following images are declared in compose but not found after load:" >&2
    for img in "${MISSING[@]}"; do
      echo "  - $img" >&2
    done
    exit 1
  fi

  echo "All $IMAGE_COUNT image(s) verified."
  echo "You can now run: docker compose -f \"$COMPOSE_FILE\" up -d"
fi
