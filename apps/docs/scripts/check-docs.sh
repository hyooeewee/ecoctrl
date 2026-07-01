#!/usr/bin/env bash
# Check which pages still need content
set -e
cd /Users/godot/Desktop/ecoctrl/apps/docs

echo "=========================================="
echo "Phase checksum report"
echo "=========================================="

echo ""
echo "=== User Guide (31 pages expected) ==="
find guide/ -name "*.md" | wc -l

echo ""
echo "=== Architecture (4 pages expected) ==="
find reference/architecture/ -name "*.md" | wc -l

echo ""
echo "=== Subsystems (9 pages expected) ==="
find reference/subsystems/ -name "*.md" | wc -l

echo ""
echo "=== API Reference (8 pages expected) ==="
find reference/api/ -name "*.md" | wc -l

echo ""
echo "=== Data Model (2 pages expected) ==="
find reference/data-model/ -name "*.md" | wc -l

echo ""
echo "=== Deployment (10 pages expected) ==="
find deployment/ -name "*.md" | wc -l

echo ""
echo "=== Total ==="
find guide/ reference/ deployment/ -name "*.md" | wc -l

echo ""
echo "=== Content TODO count ==="
echo -n "  guide: "; grep -rn "TODO: Phase" guide/ 2>/dev/null | wc -l
echo -n "  reference: "; grep -rn "TODO: Phase" reference/ 2>/dev/null | wc -l
echo -n "  deployment: "; grep -rn "TODO: Phase" deployment/ 2>/dev/null | wc -l

echo ""
echo "=== Screenshot TODO count ==="
echo -n "  guide: "; grep -rn "TODO: 截图" guide/ 2>/dev/null | wc -l
echo -n "  reference: "; grep -rn "TODO: 截图" reference/ 2>/dev/null | wc -l
echo -n "  deployment: "; grep -rn "TODO: 截图" deployment/ 2>/dev/null | wc -l

echo ""
echo "=== Build ==="
pnpm build 2>&1 | tail -5
