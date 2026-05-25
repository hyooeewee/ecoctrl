#!/usr/bin/env python3
"""
Package a directory into an .ecn plugin file.

Usage:
    python package_ecn.py <source-directory> [output.ecn]

If output.ecn is omitted, uses <directory-name>.ecn in the parent directory.
"""

import sys
import zipfile
from pathlib import Path
from typing import Optional


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

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in source_dir.rglob("*"):
            if file_path.is_file():
                arcname = file_path.relative_to(source_dir)
                zf.write(file_path, arcname)
                print(f"  Added: {arcname}")

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
