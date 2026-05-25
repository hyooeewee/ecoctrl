#!/usr/bin/env python3
"""
Scaffold a new .ecn plugin package.

Generates an unpacked directory structure by default.
Use --package to also create the .ecn archive.

Interactive usage:
    python create_ecn.py <output-directory>
    python create_ecn.py <output-directory> --package

Non-interactive usage (AI / CI):
    python create_ecn.py <output-directory> --json '<json-string>' [--package]

JSON schema for --json:
    {
      "id": "kebab-case-id",
      "name": "Display Name",
      "version": "1.0.0",
      "category": "trigger|action|condition",
      "description": "optional",
      "author": "optional",
      "color": "#3b82f6",
      "icon": "icon.svg",
      "fields": [
        {
          "name": "threshold",
          "type": "number",
          "title": "Threshold",
          "description": "optional",
          "required": true
        }
      ]
    }
"""

import hashlib
import json
import sys
import zipfile
from pathlib import Path


def get_default_icon_svg() -> str:
    """Load the default placeholder icon from the template file."""
    script_dir = Path(__file__).resolve().parent
    icon_path = script_dir / ".." / "assets" / "ecn_template" / "icon.svg"
    return icon_path.read_text(encoding="utf-8")


def prompt(text: str, default: str = "") -> str:
    full = f"{text} [{default}]: " if default else f"{text}: "
    val = input(full).strip()
    return val if val else default


def build_manifest(data: dict) -> dict:
    """Build manifest dict from JSON or interactive input."""
    manifest = {
        "id": data["id"],
        "name": data["name"],
        "version": data.get("version", "1.0.0"),
        "category": data["category"],
        "entry": "backend.js",
        "schema": "schema.json",
    }

    for key in ("description", "author", "color", "icon"):
        if data.get(key):
            manifest[key] = data[key]

    return manifest


def build_schema(name: str, fields: list) -> dict:
    """Build schema.json from field definitions."""
    properties = {}
    required = []

    for field in fields:
        prop = {
            "type": field.get("type", "string"),
            "title": field.get("title", field["name"]),
        }
        if field.get("description"):
            prop["description"] = field["description"]
        properties[field["name"]] = prop

        if field.get("required"):
            required.append(field["name"])

    schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "title": f"{name} Config",
        "properties": properties,
    }
    if required:
        schema["required"] = required

    return schema


def build_backend_js(plugin_id: str, name: str, category: str) -> str:
    return f'''/**
 * {name} — EcoCtrl Plugin Node
 * Category: {category}
 */
module.exports = async function (ctx, api) {{
  // Configuration values are available in ctx.config (injected by executor)
  // e.g. const endpoint = ctx.config.endpoint;

  api.log.info("{plugin_id} executed", {{ nodeId: api.context.nodeId }});

  return {{ success: true }};
}};
'''


def write_files(
    source_dir: Path,
    manifest: dict,
    schema: dict,
    backend_js: str,
    icon_name: str,
    icon_svg: str,
) -> None:
    """Write all files into an unpacked directory."""
    source_dir.mkdir(parents=True, exist_ok=True)

    (source_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    (source_dir / "backend.js").write_text(backend_js, encoding="utf-8")
    (source_dir / "schema.json").write_text(
        json.dumps(schema, indent=2) + "\n", encoding="utf-8"
    )
    (source_dir / icon_name).write_text(icon_svg, encoding="utf-8")


def compute_content_hash(files: list[tuple[str, bytes]]) -> str:
    """Compute SHA-256 hash over all files (sorted by name, then content)."""
    files_sorted = sorted(files, key=lambda x: x[0])
    h = hashlib.sha256()
    for name, content in files_sorted:
        h.update(name.encode("utf-8"))
        h.update(content)
    return h.hexdigest()


def package_ecn(source_dir: Path, output_ecn: Path) -> Path:
    """Pack an unpacked directory into a .ecn ZIP archive with SHA-256 comment."""
    files: list[tuple[str, bytes]] = []
    for path in sorted(source_dir.iterdir()):
        if path.is_file():
            files.append((path.name, path.read_bytes()))

    content_hash = compute_content_hash(files)

    with zipfile.ZipFile(output_ecn, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in files:
            zf.writestr(name, content)
        zf.comment = content_hash.encode("utf-8")

    return output_ecn


# ========================================
# Interactive mode
# ========================================
def create_ecn_interactive(output_dir: Path, do_package: bool) -> Path:
    print("\n🛠️  EcoCtrl Plugin Node Scaffolder\n")
    print("   [Required] = must provide a value")
    print("   [Optional] = press Enter to use the default or skip\n")

    # --- Collect metadata ---
    data = {
        "id": prompt("[Required] Plugin ID (kebab-case, e.g. 'energy-monitor')", "my-plugin"),
        "name": prompt("[Required] Display name", "My Plugin"),
        "version": prompt("[Required] Version", "1.0.0"),
        "category": prompt("[Required] Category (trigger/action/condition)", "action"),
        "description": prompt("[Optional] Description", ""),
        "author": prompt("[Optional] Author", ""),
        "color": prompt("[Optional] Node color (hex)", "#3b82f6"),
        "icon": prompt("[Optional] Icon filename", "icon.svg"),
    }

    # --- Collect schema fields ---
    print("\n📋 Schema fields (JSON Schema properties)")
    print("   Leave field name empty when done.\n")
    fields = []
    while True:
        field_name = input("Field name (or Enter to finish): ").strip()
        if not field_name:
            break
        fields.append({
            "name": field_name,
            "type": prompt("  Type (string/integer/number/boolean)", "string"),
            "title": prompt("  Title", field_name),
            "description": prompt("  Description", ""),
            "required": prompt("  Required? (y/n)", "n").lower() == "y",
        })

    manifest = build_manifest(data)
    schema = build_schema(data["name"], fields)
    backend_js = build_backend_js(data["id"], data["name"], data["category"])
    icon_name = data.get("icon") or "icon.svg"

    plugin_id = data["id"]
    source_dir = output_dir / plugin_id

    icon_svg = get_default_icon_svg()
    write_files(source_dir, manifest, schema, backend_js, icon_name, icon_svg)

    print(f"\n✅ Created source directory: {source_dir}")
    print(f"   Files: manifest.json, backend.js, schema.json, {icon_name}")
    print(f"\nNext steps:")
    print(f"   1. Edit backend.js to implement your logic")
    print(f"   2. Adjust schema.json if needed")
    if not do_package:
        print(f"   3. When ready, package with:")
        print(f"      python package_ecn.py {source_dir} {output_dir}/{plugin_id}.ecn")
        print(f"   4. Run: python validate_ecn.py {output_dir}/{plugin_id}.ecn")

    if do_package:
        ecn_path = output_dir / f"{plugin_id}.ecn"
        package_ecn(source_dir, ecn_path)
        print(f"\n📦 Packaged: {ecn_path}")

    return source_dir


# ========================================
# Non-interactive mode (AI / CI)
# ========================================
def create_ecn_from_json(output_dir: Path, json_data: dict, do_package: bool) -> Path:
    manifest = build_manifest(json_data)
    schema = build_schema(json_data["name"], json_data.get("fields", []))
    backend_js = build_backend_js(
        json_data["id"], json_data["name"], json_data["category"]
    )
    icon_name = json_data.get("icon") or "icon.svg"

    plugin_id = json_data["id"]
    source_dir = output_dir / plugin_id

    icon_svg = json_data.get("icon_svg") or get_default_icon_svg()
    write_files(source_dir, manifest, schema, backend_js, icon_name, icon_svg)

    print(f"✅ Created source directory: {source_dir}")
    print(f"   Files: manifest.json, backend.js, schema.json, {icon_name}")

    if do_package:
        ecn_path = output_dir / f"{plugin_id}.ecn"
        package_ecn(source_dir, ecn_path)
        print(f"📦 Packaged: {ecn_path}")
        return ecn_path

    return source_dir


# ========================================
# CLI entrypoint
# ========================================
def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python create_ecn.py <output-directory> [--json '<json-string>'] [--package]")
        sys.exit(1)

    output_dir = Path(args[0])
    do_package = "--package" in args

    # Check for --json mode
    if "--json" in args:
        idx = args.index("--json")
        if idx + 1 >= len(args):
            print("Error: --json requires a JSON string argument")
            sys.exit(1)

        json_str = args[idx + 1]
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"Error: invalid JSON — {e}")
            sys.exit(1)

        # Validate required fields
        for key in ("id", "name", "category"):
            if not data.get(key):
                print(f"Error: missing required field '{key}' in JSON")
                sys.exit(1)

        create_ecn_from_json(output_dir, data, do_package)
    else:
        create_ecn_interactive(output_dir, do_package)


if __name__ == "__main__":
    main()
