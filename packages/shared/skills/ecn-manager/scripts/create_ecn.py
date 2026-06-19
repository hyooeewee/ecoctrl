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
      "icon": "box",
      "fields": [
        {
          "name": "threshold",
          "type": "number",
          "title": "阈值",
          "description": "optional",
          "required": true,
          "default": 100,
          "enum": [10, 50, 100]
        }
      ],
      "outputs": [
        {
          "name": "value",
          "type": "number",
          "description": "读取到的值"
        }
      ]
    }
"""

import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
ICONS_PATH = SKILL_DIR / "assets" / "icons" / "icons.json"

# ========================================
# Naming validation
# ========================================
ID_RE = re.compile(r"^[a-z0-9-]+$")


def validate_id(value: str, label: str = "id") -> None:
    """Ensure an id/alias follows the kebab-case convention."""
    if not value:
        raise ValueError(f"{label} is required")
    if not ID_RE.match(value):
        raise ValueError(
            f"{label} '{value}' must be kebab-case: lowercase letters, numbers, and hyphens only"
        )


def validate_aliases(aliases: list | None) -> None:
    """Ensure aliases are valid kebab-case ids and do not duplicate."""
    if not aliases:
        return
    if not isinstance(aliases, list):
        raise ValueError("aliases must be an array")
    seen = set()
    for alias in aliases:
        validate_id(alias, "alias")
        if alias in seen:
            raise ValueError(f"duplicate alias '{alias}'")
        seen.add(alias)


# ========================================
# Icon library
# ========================================
def load_icon_library() -> dict[str, str]:
    """Load the icon library from assets/icons/icons.json."""
    if ICONS_PATH.exists():
        return json.loads(ICONS_PATH.read_text(encoding="utf-8"))
    return {}


def get_icon_svg(icon_name: str) -> str:
    """Resolve an icon name to SVG content.

    Lookup order:
      1. Exact match in icon library (e.g. "zap" -> zap.svg content)
      2. Treat as raw SVG string (backward compat)
      3. Fallback to "box" placeholder
    """
    lib = load_icon_library()

    # Strip .svg extension if present for lookup
    clean = icon_name.replace(".svg", "") if icon_name.endswith(".svg") else icon_name
    if clean in lib:
        return lib[clean]

    # If it looks like raw SVG, use as-is
    if icon_name.strip().startswith("<svg"):
        return icon_name

    # Fallback to box
    if "box" in lib:
        return lib["box"]

    # Last resort hardcoded
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>'


def list_icons() -> list[str]:
    """Return available icon names."""
    return sorted(load_icon_library().keys())


# ========================================
# Prompt helper (interactive mode)
# ========================================
def prompt(text: str, default: str = "") -> str:
    full = f"{text} [{default}]: " if default else f"{text}: "
    val = input(full).strip()
    return val if val else default


# ========================================
# Build manifest.json
# ========================================
def build_manifest(data: dict) -> dict:
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

    aliases = data.get("aliases")
    if aliases:
        manifest["aliases"] = aliases

    return manifest


# ========================================
# Build schema.json
# ========================================
def build_schema(name: str, fields: list, outputs: list | None = None) -> dict:
    """Build schema.json from field and output definitions."""
    properties = {}
    required = []

    for field in fields:
        prop: dict = {
            "type": field.get("type", "string"),
            "title": field.get("title", field["name"]),
        }
        if field.get("description"):
            prop["description"] = field["description"]
        if field.get("default") is not None:
            prop["default"] = field["default"]
        if field.get("enum"):
            prop["enum"] = field["enum"]
        if field.get("format"):
            prop["format"] = field["format"]
        if field.get("items"):
            prop["items"] = field["items"]
        properties[field["name"]] = prop

        if field.get("required"):
            required.append(field["name"])

    schema: dict = {
        "type": "object",
        "title": name,
        "properties": properties,
    }
    if required:
        schema["required"] = required

    # Add outputs section for downstream node data flow
    if outputs:
        out_props = {}
        for out in outputs:
            out_prop: dict = {}
            if out.get("type"):
                out_prop["type"] = out["type"]
            if out.get("description"):
                out_prop["description"] = out["description"]
            out_props[out["name"]] = out_prop
        schema["outputs"] = {
            "type": "object",
            "properties": out_props,
        }

    return schema


# ========================================
# Build backend.js skeleton
# ========================================
def _indent(text: str, spaces: int) -> str:
    """Indent each line of text by `spaces` spaces."""
    prefix = " " * spaces
    return "\n".join(prefix + line if line.strip() else "" for line in text.split("\n"))


def _build_field_extraction(fields: list) -> str:
    """Generate config extraction + validation lines from field definitions."""
    lines = []
    for field in fields:
        name = field["name"]
        ftype = field.get("type", "string")

        # Type coercion
        if ftype in ("number", "integer"):
            cast = "Number" if ftype == "number" else "Math.round(Number"
            default = field.get("default", "0")
            if ftype == "integer":
                lines.append(f'  const {name} = {cast}(ctx.config.{name} || {default}));')
            else:
                lines.append(f'  const {name} = {cast}(ctx.config.{name} || {default});')
        elif ftype == "boolean":
            default = "true" if field.get("default") else "false"
            lines.append(f'  const {name} = Boolean(ctx.config.{name} ?? {default});')
        else:
            default = json.dumps(field.get("default", ""), ensure_ascii=False)
            lines.append(f'  const {name} = String(ctx.config.{name} || {default});')

        # Validation for required fields
        if field.get("required"):
            if ftype in ("number", "integer"):
                lines.append(
                    f'\n  if ({name} === undefined || {name} === null || isNaN({name})) {{\n'
                    f"    api.log.error(\"[__NODE_ID__] missing required field '{name}'\");\n"
                    f'    throw new Error("__NODE_ID__ node requires \'{name}\'");\n'
                    f'  }}'
                )
            else:
                lines.append(
                    f'\n  if (!{name}) {{\n'
                    f"    api.log.error(\"[__NODE_ID__] missing required field '{name}'\");\n"
                    f'    throw new Error("__NODE_ID__ node requires \'{name}\'");\n'
                    f'  }}'
                )
        lines.append("")

    result = "\n".join(lines)
    # Strip trailing empty lines
    while result.endswith("\n\n"):
        result = result[:-1]
    return result


def _build_outputs_object(outputs: list | None) -> str:
    """Generate the return object from output definitions."""
    if not outputs:
        return "  return { success: true };"
    pairs = []
    for out in outputs:
        pairs.append(f"  {out['name']}: undefined  // TODO: set from logic above")
    return "return {\n" + ",\n".join(pairs) + ",\n};"


def build_backend_js(
    plugin_id: str,
    name: str,
    category: str,
    fields: list | None = None,
    outputs: list | None = None,
) -> str:
    """Generate a backend.js skeleton with proper patterns."""
    fields = fields or []
    outputs = outputs or []

    # Config extraction + validation
    if fields:
        extraction = _build_field_extraction(fields)
        # Replace placeholder node_id
        extraction = extraction.replace("__NODE_ID__", plugin_id)
    else:
        extraction = "  // No config fields defined"

    # Return object
    if outputs:
        ret_pairs = []
        for out in outputs:
            ret_pairs.append(f"    {out['name']}: undefined, // TODO: set from logic above")
        ret_block = "  return {\n" + "\n".join(ret_pairs) + "\n  };"
    else:
        ret_block = "  return { success: true };"

    return f'''/**
 * {name}
 * Category: {category}
 */
module.exports = async function execute(ctx, api) {{
{extraction}
  api.log.info("[{plugin_id}] executed");

  try {{
    // TODO: implement business logic here

{ret_block}
  }} catch (err) {{
    api.log.error(`[{plugin_id}] execution failed: ${{err.message}}`);
    throw new Error("{name} 执行失败: " + err.message, {{ cause: err }});
  }}
}};
'''


# ========================================
# Write all files to source directory
# ========================================
def write_files(
    source_dir: Path,
    manifest: dict,
    schema: dict,
    backend_js: str,
    icon_svg: str,
) -> None:
    """Write all files into an unpacked directory."""
    source_dir.mkdir(parents=True, exist_ok=True)

    (source_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (source_dir / "backend.js").write_text(backend_js, encoding="utf-8")
    (source_dir / "schema.json").write_text(
        json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (source_dir / "icon.svg").write_text(icon_svg, encoding="utf-8")


# ========================================
# Package to .ecn
# ========================================
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
    print("\n  EcoCtrl Plugin Node Scaffolder\n")
    print("   [Required] = must provide a value")
    print("   [Optional] = press Enter to use the default or skip\n")

    available_icons = list_icons()
    if available_icons:
        print(f"   Available icons: {', '.join(available_icons)}\n")

    # --- Collect metadata ---
    data = {
        "id": prompt("[Required] Plugin ID (kebab-case, e.g. 'energy-monitor')", "my-plugin"),
        "name": prompt("[Required] Display name", "My Plugin"),
        "version": prompt("[Required] Version", "1.0.0"),
        "category": prompt("[Required] Category (trigger/action/condition)", "action"),
        "description": prompt("[Optional] Description", ""),
        "author": prompt("[Optional] Author", ""),
        "color": prompt("[Optional] Node color (hex)", "#3b82f6"),
        "icon": prompt("[Optional] Icon name (or 'list' to see options)", "box"),
    }

    try:
        validate_id(data["id"])
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    aliases_str = prompt("[Optional] Aliases (comma-separated kebab-case, for renamed nodes)", "")
    data["aliases"] = [a.strip() for a in aliases_str.split(",") if a.strip()]
    try:
        validate_aliases(data["aliases"])
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    if data["icon"] == "list":
        print(f"\n   Available icons: {', '.join(available_icons)}")
        data["icon"] = prompt("Icon name", "box")

    # --- Collect schema fields ---
    print("\n  Schema fields (JSON Schema properties)")
    print("   Leave field name empty when done.\n")
    fields = []
    while True:
        field_name = input("Field name (or Enter to finish): ").strip()
        if not field_name:
            break
        fields.append({
            "name": field_name,
            "type": prompt("  Type (string/number/integer/boolean/object/array)", "string"),
            "title": prompt("  Title (display label)", field_name),
            "description": prompt("  Description", ""),
            "required": prompt("  Required? (y/n)", "n").lower() == "y",
        })

    # --- Collect outputs ---
    print("\n  Output fields (what downstream nodes can access)")
    print("   Leave output name empty when done.\n")
    outputs = []
    while True:
        out_name = input("Output name (or Enter to finish): ").strip()
        if not out_name:
            break
        outputs.append({
            "name": out_name,
            "type": prompt("  Type (string/number/integer/boolean/object)", "string"),
            "description": prompt("  Description", ""),
        })

    # --- Build ---
    icon_name = data.get("icon") or "box"
    manifest = build_manifest(data)
    schema = build_schema(data["name"], fields, outputs)
    backend_js = build_backend_js(
        data["id"], data["name"], data["category"], fields, outputs
    )
    icon_svg = get_icon_svg(icon_name)

    plugin_id = data["id"]
    source_dir = output_dir / plugin_id

    write_files(source_dir, manifest, schema, backend_js, icon_svg)

    print(f"\n Created source directory: {source_dir}")
    print(f"   Files: manifest.json, backend.js, schema.json, icon.svg")
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
        print(f"\n  Packaged: {ecn_path}")

    return source_dir


# ========================================
# Non-interactive mode (AI / CI)
# ========================================
def create_ecn_from_json(output_dir: Path, json_data: dict, do_package: bool) -> Path:
    try:
        validate_id(json_data["id"])
        validate_aliases(json_data.get("aliases"))
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    fields = json_data.get("fields", [])
    outputs = json_data.get("outputs", [])

    manifest = build_manifest(json_data)
    schema = build_schema(json_data["name"], fields, outputs)
    backend_js = build_backend_js(
        json_data["id"],
        json_data["name"],
        json_data["category"],
        fields,
        outputs,
    )

    # Resolve icon: name lookup > raw SVG > fallback
    icon_input = json_data.get("icon", "box")
    icon_svg = get_icon_svg(icon_input)

    plugin_id = json_data["id"]
    source_dir = output_dir / plugin_id

    write_files(source_dir, manifest, schema, backend_js, icon_svg)

    print(f"Created source directory: {source_dir}")
    print(f"   Files: manifest.json, backend.js, schema.json, icon.svg")

    if do_package:
        ecn_path = output_dir / f"{plugin_id}.ecn"
        package_ecn(source_dir, ecn_path)
        print(f"  Packaged: {ecn_path}")
        return ecn_path

    return source_dir


# ========================================
# CLI entrypoint
# ========================================
def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: python create_ecn.py <output-directory> [--json '<json-string>'] [--package]")
        print("       python create_ecn.py --list-icons")
        sys.exit(1)

    # Special command: list available icons
    if "--list-icons" in args:
        icons = list_icons()
        print(f"Available icons ({len(icons)}):")
        for name in icons:
            print(f"  - {name}")
        sys.exit(0)

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
            print(f"Error: invalid JSON: {e}")
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
