#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_FILE="$SCRIPT_DIR/../apps/admin/package.json"

# Read version and name from package.json
VERSION=$(node -p "require('$PKG_FILE').version")
PKG_NAME=$(node -p "require('$PKG_FILE').name")
TAG="v${VERSION}-rc"

# Create and push tag (force overwrite so manual re-runs work)
git tag -f "$TAG"
git push -f origin "$TAG"

# changesets/action@v1 parses stdout for "New tag:" to determine published=true.
# This line MUST only appear when a new tag is actually created.
echo "New tag: $PKG_NAME@$VERSION"
