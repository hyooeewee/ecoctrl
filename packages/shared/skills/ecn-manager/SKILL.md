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

### 1. Capture Intent

**Step A — Ask once if information is insufficient (max one round):**

If the user only says "create a node" or similar vague request without any specifics, ask once to understand the purpose and context, for example:

- What will this node do? (read sensor, call API, cron trigger, send notification, etc.)
- What type of node is this? (trigger / action / condition)

**Step B — Use `AskUserQuestion` to collect everything in one go:**

Generate 2 concrete candidate options **based on the user's purpose**, plus a 3rd option meaning "AI decides based on purpose". Use the **same language as the current conversation** for option labels (not hardcoded English).

Example (English conversation):

1. **Plugin ID** — `energy-monitor` / `power-tracker` / `AI decides based on purpose`
2. **Display name** — `Energy Monitor` / `Power Tracker` / `AI decides based on purpose`
3. **Category** — `trigger` / `action` / `condition` / `AI decides based on purpose`
4. **Config fields** — `threshold + endpoint` / `interval + timeout` / `none` / `AI decides based on purpose`

**AI design rules (when the user picks "AI decides"):**

Do NOT use generic defaults. Derive every value from the stated purpose:

| Field           | Rule                                                                                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | kebab-case, derived from purpose keywords                                                                                                                                                                                     |
| `name`          | human-readable, derived from purpose                                                                                                                                                                                          |
| `color`         | Pick a semantic color based on category/purpose: trigger=`#f59e0b` (amber), action=`#3b82f6` (blue), condition=`#22c55e` (green). Override if the domain has a stronger association (e.g. energy=`#22c55e`, alert=`#ef4444`). |
| `description`   | One sentence summarizing what the node does                                                                                                                                                                                   |
| `config fields` | Infer the minimal useful fields from the purpose. A sensor reader needs `endpoint` + `interval`; a threshold alert needs `threshold` + `comparison`.                                                                          |
| `version`       | Always `1.0.0`                                                                                                                                                                                                                |
| `icon`          | Always `icon.svg` (placeholder)                                                                                                                                                                                               |
| `author`        | Empty (omitted from manifest)                                                                                                                                                                                                 |

### 2. Scaffold (new node)

After collecting all information via AskUserQuestion, generate an **unpacked source directory** first. Do NOT create the `.ecn` archive yet.

**Option A — Use the non-interactive script (preferred):**

```bash
python <skill-path>/scripts/create_ecn.py <output-directory> --json '<metadata-json>'
```

**Prefer `.` (the session's working directory) as `<output-directory>`.** Only use a different path if the user explicitly requests it or the context requires it (e.g. CI, ephemeral workspace).

This creates a folder like `./<plugin-id>/` containing:

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

If the script is unavailable, write the 4 files directly with `Write` into a folder under the **current working directory**:

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

### 4. Package

After editing is complete, package the source directory into a `.ecn` file:

```bash
python <skill-path>/scripts/package_ecn.py <source-directory> [output.ecn]
```

### 5. Validate

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

### 6. Install

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
