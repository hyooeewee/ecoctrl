#!/usr/bin/env python3
"""
Validate an .ecn plugin package against the EcoCtrl manifest schema.

Usage:
    python validate_ecn.py <path/to/plugin.ecn>

Exit codes:
    0 = valid
    1 = invalid
"""

import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path


def compute_content_hash(files: list[tuple[str, bytes]]) -> str:
    """Compute SHA-256 hash over all files (sorted by name, then content)."""
    files_sorted = sorted(files, key=lambda x: x[0])
    h = hashlib.sha256()
    for name, content in files_sorted:
        h.update(name.encode("utf-8"))
        h.update(content)
    return h.hexdigest()


def validate_manifest(manifest: dict) -> list[str]:
    """Validate manifest.json content. Returns list of error messages."""
    errors = []

    required = ["id", "name", "version", "category"]
    for field in required:
        if field not in manifest:
            errors.append(f"Missing required field: '{field}'")

    if "id" in manifest:
        nid = manifest["id"]
        if not isinstance(nid, str):
            errors.append("'id' must be a string")
        elif not re.match(r"^[a-z0-9_-]+$", nid):
            errors.append(f"'id' '{nid}' must match ^[a-z0-9_-]+")

    if "name" in manifest:
        if not isinstance(manifest["name"], str) or not manifest["name"].strip():
            errors.append("'name' must be a non-empty string")

    if "version" in manifest:
        ver = manifest["version"]
        if not isinstance(ver, str) or not re.match(r"^\d+\.\d+\.\d+$", ver):
            errors.append(f"'version' '{ver}' must match semver (e.g. 1.0.0)")

    if "category" in manifest:
        cat = manifest["category"]
        if cat not in ("trigger", "action", "condition"):
            errors.append(f"'category' must be 'trigger', 'action', or 'condition', got '{cat}'")

    if "entry" in manifest:
        if not isinstance(manifest["entry"], str):
            errors.append("'entry' must be a string")
    if "schema" in manifest:
        if not isinstance(manifest["schema"], str):
            errors.append("'schema' must be a string")

    return errors


def validate_schema(schema: dict) -> list[str]:
    """Validate schema.json content."""
    errors = []
    if schema.get("type") != "object":
        errors.append("schema.json top-level 'type' must be 'object'")
    if "properties" not in schema:
        errors.append("schema.json must have a 'properties' field")
    return errors


def validate_backend(code: str) -> list[str]:
    """Basic syntax checks for backend.js."""
    errors = []
    if "module.exports" not in code:
        errors.append("backend.js must export a function via module.exports")
    return errors


def validate_ecn(path: Path) -> tuple[bool, list[str]]:
    """Validate an .ecn file. Returns (is_valid, errors)."""
    errors = []

    if not path.exists():
        return False, [f"File not found: {path}"]

    if not zipfile.is_zipfile(path):
        return False, [f"Not a valid ZIP file: {path}"]

    try:
        with zipfile.ZipFile(path, "r") as zf:
            names = zf.namelist()

            # Check manifest
            if "manifest.json" not in names:
                errors.append("manifest.json is required")
                return False, errors

            manifest_raw = zf.read("manifest.json").decode("utf-8")
            try:
                manifest = json.loads(manifest_raw)
            except json.JSONDecodeError as e:
                errors.append(f"Invalid JSON in manifest.json: {e}")
                return False, errors

            errors.extend(validate_manifest(manifest))

            # Check entry file
            entry = manifest.get("entry", "backend.js")
            if entry not in names:
                errors.append(f"Entry file '{entry}' not found")

            # Check schema file
            schema_file = manifest.get("schema", "schema.json")
            if schema_file not in names:
                errors.append(f"Schema file '{schema_file}' not found")
            else:
                schema_raw = zf.read(schema_file).decode("utf-8")
                try:
                    schema = json.loads(schema_raw)
                except json.JSONDecodeError as e:
                    errors.append(f"Invalid JSON in {schema_file}: {e}")
                else:
                    errors.extend(validate_schema(schema))

            # Check backend.js
            if entry in names:
                backend_code = zf.read(entry).decode("utf-8")
                errors.extend(validate_backend(backend_code))

            # Check icon if referenced
            icon = manifest.get("icon")
            if icon and icon not in names:
                errors.append(f"Icon file '{icon}' referenced but not found")

            # Verify content hash if zip comment present
            comment = zf.comment.decode("utf-8").strip() if zf.comment else None
            if comment:
                files_for_hash = []
                for name in names:
                    files_for_hash.append((name, zf.read(name)))
                expected = comment
                actual = compute_content_hash(files_for_hash)
                if expected != actual:
                    errors.append(f"SHA-256 hash mismatch (expected: {expected}, actual: {actual})")

    except zipfile.BadZipFile as e:
        return False, [f"Bad ZIP file: {e}"]
    except Exception as e:
        return False, [f"Unexpected error: {e}"]

    return len(errors) == 0, errors


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python validate_ecn.py <path/to/plugin.ecn>")
        return 1

    path = Path(sys.argv[1])
    valid, errs = validate_ecn(path)

    if valid:
        print(f"OK {path.name} is valid")
        return 0
    else:
        print(f"FAIL {path.name} has {len(errs)} error(s):")
        for e in errs:
            print(f"   - {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
