---
name: ecn-manager
description: Create, modify, and validate EcoCtrl .ecn plugin node packages. Use whenever the user wants to build a custom workflow node, edit an existing plugin, or validate a .ecn file. Also use when the user mentions 'plugin node', 'custom node', 'workflow node', '.ecn file', or wants to extend the workflow engine with new actions, triggers, or conditions.
license: MIT
metadata:
  version: 1.1.0
  author: EcoCtrl Team
---

# ECN Manager

A skill for managing EcoCtrl workflow plugin nodes (`.ecn` files).

## What is an .ecn file?

An `.ecn` file is a ZIP archive containing:

- `manifest.json` — Plugin identity (id, name, version, category, etc.)
- `backend.js` — JavaScript code executed in a sandboxed `isolated-vm`
- `schema.json` — JSON Schema defining the node's configuration form
- `icon.svg` — Optional node icon

## Workflow

### 1. Capture Intent (AskUserQuestion)

Use **one round of `AskUserQuestion`** to collect everything. Do NOT ask one by one in chat.

**Required questions (always ask):**

1. **Plugin ID** — kebab-case identifier (e.g. `energy-monitor`)
2. **Display name** — human-readable name (e.g. `Energy Monitor`)
3. **Category** — `trigger` / `action` / `condition`
4. **What should this node do?** — one sentence description
5. **Config fields** — list of form fields the node needs (name, type, title, description, required?)

**Mode choice (present as single-select):**

- **Quick mode** — only the 5 questions above; AI decides color, icon, description, author
- **Custom mode** — after the 5 questions, ask color, icon, description, author one by one
- **Decide for me** — AI picks smart defaults for everything based on category and purpose

**Rules:**

- If the user chooses **Quick** or **Decide for me**, do NOT ask for optional fields.
- Default values when AI decides:
  - `version`: `1.0.0`
  - `color`: `#3b82f6` (blue, neutral default)
  - `icon`: `icon.svg` (a simple placeholder SVG is auto-generated)
  - `description`: derived from the "what should this node do" answer
  - `author`: empty (omitted from manifest)

### 2. Scaffold (new node)

After collecting all information via AskUserQuestion, generate an **unpacked source directory** first. Do NOT create the `.ecn` archive yet.

**Option A — Use the non-interactive script (preferred):**

```bash
python <skill-path>/scripts/create_ecn.py <output-directory> --json '<metadata-json>'
```

This creates a folder like `<output-directory>/<plugin-id>/` containing:

- `manifest.json`
- `backend.js`
- `schema.json`
- `icon.svg`

Pass a single JSON string with all fields:

```json
{
  "id": "energy-monitor",
  "name": "Energy Monitor",
  "version": "1.0.0",
  "category": "trigger",
  "description": "...",
  "author": "...",
  "color": "#3b82f6",
  "icon": "icon.svg",
  "fields": [
    {
      "name": "threshold",
      "type": "number",
      "title": "Threshold",
      "description": "...",
      "required": true
    }
  ]
}
```

**Option B — Direct file generation:**

If the script is unavailable, write the 4 files directly with `Write` into a folder:

- `<plugin-id>/manifest.json`
- `<plugin-id>/backend.js`
- `<plugin-id>/schema.json`
- `<plugin-id>/icon.svg` (placeholder)

### 3. Implement backend.js

Edit the generated `backend.js` to implement the node's logic. Use the PluginApi reference (see `references/plugin_api_reference.md`) for available APIs.

Key rules:

- Must export via `module.exports = async function(ctx, api) { ... }`
- `ctx.config` contains values from the node's config form (defined by schema.json)
- Return an object — it becomes the node's output for downstream nodes
- Use `api.log.info/warn/error` for debugging
- Handle errors gracefully; uncaught errors fail the workflow execution

### 4. Implement backend.js

Edit the generated `backend.js` to implement the node's logic. Use the PluginApi reference (see `references/plugin_api_reference.md`) for available APIs.

Key rules:

- Must export via `module.exports = async function(ctx, api) { ... }`
- `ctx.config` contains values from the node's config form (defined by schema.json)
- Return an object — it becomes the node's output for downstream nodes
- Use `api.log.info/warn/error` for debugging
- Handle errors gracefully; uncaught errors fail the workflow execution

### 5. Package

After editing is complete, package the source directory into a `.ecn` file:

```bash
python <skill-path>/scripts/package_ecn.py <source-directory> [output.ecn]
```

### 6. Validate

Always validate before considering the node done:

```bash
python <skill-path>/scripts/validate_ecn.py <path/to/plugin.ecn>
```

Checks:

- manifest.json has all required fields and valid values
- entry file and schema file exist
- schema.json is valid JSON with type="object" and properties
- backend.js contains `module.exports`
- Referenced icon file exists

### 7. Install

The user installs the `.ecn` through the Admin UI:

- Go to Workflow Editor → Node Library → Upload
- Or use the API: `POST /api/nodes/install` with the `.ecn` file

## Reference Files

Read these when you need detailed API docs:

- `references/manifest_schema.md` — manifest.json field reference
- `references/plugin_api_reference.md` — Full PluginApi interface
- `references/backend_patterns.md` — Common backend.js code patterns

## Modifying an Existing Node

1. Extract the `.ecn` with `extract_ecn.py`
2. Edit the files
3. Re-package with `package_ecn.py`
4. Validate with `validate_ecn.py`
5. Re-install through Admin UI (uninstall old version first if id/version changed)
