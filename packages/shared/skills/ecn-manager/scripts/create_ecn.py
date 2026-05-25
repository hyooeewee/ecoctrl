#!/usr/bin/env python3
"""
Scaffold a new .ecn plugin package from an interactive template.

Usage:
    python create_ecn.py <output-directory>

Prompts for plugin metadata and generates a ready-to-edit .ecn package.
"""

import json
import zipfile
from pathlib import Path
from datetime import datetime


def prompt(text: str, default: str = "") -> str:
    full = f"{text} [{default}]: " if default else f"{text}: "
    val = input(full).strip()
    return val if val else default


def create_ecn(output_dir: Path) -> Path:
    print("\n🛠️  EcoCtrl Plugin Node Scaffolder\n")

    # --- Collect metadata ---
    plugin_id = prompt("Plugin ID (kebab-case, e.g. 'energy-monitor')", "my-plugin")
    name = prompt("Display name", "My Plugin")
    version = prompt("Version", "1.0.0")
    category = prompt("Category (trigger/action/condition)", "action")
    description = prompt("Description", "")
    author = prompt("Author", "")

    manifest = {
        "id": plugin_id,
        "name": name,
        "version": version,
        "category": category,
        "description": description or None,
        "entry": "backend.js",
        "schema": "schema.json",
        "author": author or None,
    }
    # Remove None values for cleanliness
    manifest = {k: v for k, v in manifest.items() if v is not None}

    # --- Collect schema fields ---
    print("\n📋 Schema fields (JSON Schema properties)")
    print("   Leave field name empty when done.\n")
    properties = {}
    required = []
    while True:
        field_name = input("Field name (or Enter to finish): ").strip()
        if not field_name:
            break
        field_type = prompt("  Type (string/integer/number/boolean)", "string")
        field_title = prompt("  Title", field_name)
        field_desc = prompt("  Description", "")
        is_required = prompt("  Required? (y/n)", "n").lower() == "y"

        prop = {"type": field_type, "title": field_title}
        if field_desc:
            prop["description"] = field_desc
        properties[field_name] = prop
        if is_required:
            required.append(field_name)

    schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "title": f"{name} Config",
        "properties": properties,
    }
    if required:
        schema["required"] = required

    # --- backend.js ---
    backend_js = f'''/**
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

    # --- Write files ---
    output_dir.mkdir(parents=True, exist_ok=True)
    ecn_path = output_dir / f"{plugin_id}.ecn"

    with zipfile.ZipFile(ecn_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest, indent=2) + "\n")
        zf.writestr("backend.js", backend_js)
        zf.writestr("schema.json", json.dumps(schema, indent=2) + "\n")

    print(f"\n✅ Created: {ecn_path}")
    print(f"   Files: manifest.json, backend.js, schema.json")
    print(f"\nNext steps:")
    print(f"   1. Edit backend.js to implement your logic")
    print(f"   2. Adjust schema.json if needed")
    print(f"   3. Run: python validate_ecn.py {ecn_path}")

    return ecn_path


def main():
    import sys
    if len(sys.argv) != 2:
        print("Usage: python create_ecn.py <output-directory>")
        sys.exit(1)

    output_dir = Path(sys.argv[1])
    create_ecn(output_dir)


if __name__ == "__main__":
    main()
