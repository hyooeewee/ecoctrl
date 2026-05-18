#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_FILE="$SCRIPT_DIR/../apps/admin/package.json"

# Read version and name from package.json
VERSION=$(node -p "require('$PKG_FILE').version")
PKG_NAME=$(node -p "require('$PKG_FILE').name")
TAG="v${VERSION}-rc"

# Check if tag already exists on remote
if git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  echo "Tag $TAG already exists on remote, skipping"
  exit 0
fi

# Create and push tag
git tag "$TAG"
git push origin "$TAG"

# changesets/action@v1 parses stdout for "New tag:" to determine published=true.
# This line MUST only appear when a new tag is actually created.
echo "New tag: $PKG_NAME@$VERSION"
