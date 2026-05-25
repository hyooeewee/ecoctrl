#!/usr/bin/env python3
"""
Extract an .ecn plugin package to a directory for editing.

Usage:
    python extract_ecn.py <plugin.ecn> <output-directory>
"""

import sys
import zipfile
from pathlib import Path


def extract_ecn(ecn_path: Path, out_dir: Path) -> None:
    if not ecn_path.exists():
        print(f"❌ File not found: {ecn_path}")
        sys.exit(1)

    if not zipfile.is_zipfile(ecn_path):
        print(f"❌ Not a valid ZIP file: {ecn_path}")
        sys.exit(1)

    out_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(ecn_path, "r") as zf:
        zf.extractall(out_dir)

    print(f"✅ Extracted {ecn_path.name} to {out_dir}/")
    for f in sorted(out_dir.iterdir()):
        print(f"   {f.name}")


def main():
    if len(sys.argv) != 3:
        print("Usage: python extract_ecn.py <plugin.ecn> <output-directory>")
        sys.exit(1)

    extract_ecn(Path(sys.argv[1]), Path(sys.argv[2]))


if __name__ == "__main__":
    main()
