#!/usr/bin/env python3
"""
Package a directory into an .ecn plugin file.

Computes a SHA-256 content hash and writes it as the ZIP comment
so the EcoCtrl engine can verify package integrity on install.

Usage:
    python package_ecn.py <source-directory> [output.ecn]

If output.ecn is omitted, uses <directory-name>.ecn in the parent directory.
"""

import hashlib
import sys
import zipfile
from pathlib import Path
from typing import Optional


def compute_content_hash(files: list[tuple[str, bytes]]) -> str:
    """Compute a SHA-256 hash over all files (sorted by name, then content)."""
    files_sorted = sorted(files, key=lambda x: x[0])
    h = hashlib.sha256()
    for name, content in files_sorted:
        h.update(name.encode("utf-8"))
        h.update(content)
    return h.hexdigest()


def package_ecn(source_dir: Path, output_path: Optional[Path] = None) -> Path:
    if not source_dir.is_dir():
        print(f"❌ Not a directory: {source_dir}")
        sys.exit(1)

    manifest_file = source_dir / "manifest.json"
    if not manifest_file.exists():
        print(f"❌ manifest.json not found in {source_dir}")
        sys.exit(1)

    if output_path is None:
        output_path = source_dir.parent / f"{source_dir.name}.ecn"

    # Collect all files and compute hash
    files: list[tuple[str, bytes]] = []
    for file_path in source_dir.rglob("*"):
        if file_path.is_file():
            arcname = str(file_path.relative_to(source_dir))
            content = file_path.read_bytes()
            files.append((arcname, content))
            print(f"  Added: {arcname}")

    content_hash = compute_content_hash(files)
    print(f"  SHA-256: {content_hash}")

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for arcname, content in files:
            zf.writestr(arcname, content)
        zf.comment = content_hash.encode("utf-8")

    print(f"\n✅ Packaged to: {output_path}")
    return output_path


def main():
    if len(sys.argv) < 2:
        print("Usage: python package_ecn.py <source-directory> [output.ecn]")
        sys.exit(1)

    source = Path(sys.argv[1])
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    package_ecn(source, output)


if __name__ == "__main__":
    main()
