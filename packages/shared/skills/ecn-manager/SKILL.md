---
name: ecn-manager
description: Create, modify, and validate EcoCtrl .ecn plugin node packages. Use whenever the user wants to build a custom workflow node, edit an existing plugin, or validate a .ecn file. Also use when the user mentions 'plugin node', 'custom node', 'workflow node', '.ecn file', or wants to extend the workflow engine with new actions, triggers, or conditions.
license: MIT
metadata:
  version: 2.0.0
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

## Core Principle

> **AI decides, scripts generate, scripts validate.**
>
> The AI's job is to understand user intent and produce structured parameters.
> All file generation is handled by scripts — never write JSON/SVG by hand.

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
| `id`            | **kebab-case only**: lowercase letters, numbers, hyphens. No underscores. Must match `^[a-z0-9-]+$`. The output folder name must equal the `id`.                                                                              |
| `name`          | human-readable, derived from purpose                                                                                                                                                                                          |
| `color`         | Pick a semantic color based on category/purpose: trigger=`#f59e0b` (amber), action=`#3b82f6` (blue), condition=`#22c55e` (green). Override if the domain has a stronger association (e.g. energy=`#22c55e`, alert=`#ef4444`). |
| `description`   | One sentence summarizing what the node does                                                                                                                                                                                   |
| `config fields` | Infer the minimal useful fields from the purpose. A sensor reader needs `endpoint` + `interval`; a threshold alert needs `threshold` + `comparison`.                                                                          |
| `version`       | `1.0.0` for new nodes. Bump at least the minor version when renaming.                                                                                                                                                         |
| `aliases`       | Optional array of previous `id`s. Use only when renaming an existing node. Each alias must be kebab-case and must not duplicate the current `id`.                                                                             |
| `icon`          | Pick an icon NAME from the icon library (see below). Do NOT generate SVG strings.                                                                                                                                             |
| `author`        | Empty (omitted from manifest)                                                                                                                                                                                                 |

**Icon selection rules:**

Pick an icon name from the available library. The script resolves it to SVG automatically.

| Purpose keywords        | Icon name             |
| ----------------------- | --------------------- |
| cron / schedule / timer | `clock` or `timer`    |
| email / mail / notify   | `mail` or `bell`      |
| database / storage      | `database`            |
| API / HTTP / webhook    | `globe` or `webhook`  |
| sensor / metric / read  | `activity` or `gauge` |
| alert / warning         | `alert-triangle`      |
| energy / power          | `zap`                 |
| file / export / import  | `file-text`           |
| filter / condition      | `filter`              |
| calculate / math        | `calculator`          |
| start / trigger         | `play`                |
| stop / end              | `square`              |
| loop / repeat           | `loop`                |
| parallel                | `layers`              |
| switch / route          | `shuffle`             |
| send / push             | `send`                |
| code / transform        | `code`                |
| settings / config       | `settings`            |
| success / done          | `check-circle`        |
| error / fail            | `x-circle`            |
| forward / next          | `arrow-right`         |
| more / expand           | `chevron-right`       |
| generic / default       | `box`                 |

To see all available icons, run: `python <skill-path>/scripts/create_ecn.py --list-icons`

### 2. Scaffold (new node)

After collecting all information via AskUserQuestion, call the script to generate all files. **Do NOT write JSON or SVG manually.**

**Step A — Build the JSON payload:**

Construct a JSON object with all collected parameters. Include `outputs` if the node produces data for downstream nodes.

```json
{
  "id": "energy-monitor",
  "name": "能源监控",
  "version": "1.0.0",
  "category": "trigger",
  "description": "定时读取能源监控数据",
  "color": "#22c55e",
  "icon": "zap",
  "fields": [
    {
      "name": "pointName",
      "type": "string",
      "title": "点位名称",
      "description": "要读取的 IoT 测点",
      "required": true
    },
    {
      "name": "interval",
      "type": "number",
      "title": "间隔 (毫秒)",
      "default": 5000
    }
  ],
  "outputs": [
    {
      "name": "value",
      "type": "number",
      "description": "读取到的测点值"
    },
    {
      "name": "pointName",
      "type": "string",
      "description": "测点名称"
    }
  ]
}
```

**Step B — Run the script:**

```bash
python <skill-path>/scripts/create_ecn.py . --json '<json-string>'
```

This generates a folder `./<plugin-id>/` with all 4 files (manifest.json, backend.js, schema.json, icon.svg).

**What the script guarantees (so you don't have to):**

- `manifest.json` has all required fields, correct types, and valid values
- `schema.json` has proper `type: "object"`, `properties`, `required`, and `outputs` sections
- `icon.svg` is a valid Lucide-style 24x24 SVG from the icon library
- `backend.js` has proper structure: named `execute` function, input validation, type coercion, structured logging with `[node_id]` prefix, try/catch with `{ cause: err }`, Chinese error messages

### 3. Implement backend.js

The script generates a skeleton. Edit it to implement the actual business logic.

**Read the skeleton first**, then fill in the `// TODO: implement business logic here` section.

Key rules:

- Must export via `module.exports = async function execute(ctx, api) { ... }`
- `ctx.config` contains values from the node's config form (defined by schema.json)
- Return an object — it becomes the node's output for downstream nodes
- Use `api.log.info/warn/error` for debugging — always with `[node_id]` prefix
- Handle errors gracefully; uncaught errors fail the workflow execution
- Use `api.*` methods only (see `references/plugin_api_reference.md`)

**Reference patterns** when implementing: `references/backend_patterns.md`

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

## Renaming an Existing Node

Renaming a node is a breaking change for workflows that reference the old `id`. Use aliases to keep old workflows running:

1. **Create the new node** (do not rename the old folder in place):
   - New folder name = new `id`.
   - Both must be kebab-case and identical.
   - Bump the version (e.g. `1.0.0` → `2.0.0`).

2. **Add the old `id` to `aliases`** in the new `manifest.json`:

   ```json
   {
     "id": "sse-send",
     "version": "2.0.0",
     "aliases": ["sse_send"]
   }
   ```

3. **Keep the old node folder** for one release cycle, then remove it after migrating or confirming no workflow references the old id.

4. **Re-seed built-in nodes** with `--prune` only in development:

   ```bash
   pnpm db:init -- --filter=nodes --prune
   ```

   In production, do not use `--prune` blindly because it deletes custom user-uploaded nodes. Delete only the specific old `id/version` prefix from S3 when safe.

## Reference Files

Read these when you need detailed API docs:

- `references/manifest_schema.md` — manifest.json field reference
- `references/plugin_api_reference.md` — Full PluginApi interface
- `references/backend_patterns.md` — Common backend.js code patterns (includes built-in node quality patterns)

## Modifying an Existing Node

1. Extract the `.ecn` with `extract_ecn.py`
2. Edit the files
3. Re-package with `package_ecn.py`
4. Validate with `validate_ecn.py`
5. Re-install through Admin UI (uninstall old version first if id/version changed)

## Available Scripts

| Script            | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `create_ecn.py`   | Scaffold a new node from structured parameters |
| `package_ecn.py`  | Pack source directory into `.ecn` archive      |
| `validate_ecn.py` | Validate a `.ecn` file                         |
| `extract_ecn.py`  | Extract a `.ecn` archive for editing           |

## Available Icon Names

Run `python <skill-path>/scripts/create_ecn.py --list-icons` to see all options. Common ones: `zap`, `clock`, `database`, `globe`, `mail`, `bell`, `activity`, `gauge`, `filter`, `calculator`, `alert-triangle`, `webhook`, `play`, `square`, `loop`, `layers`, `shuffle`, `send`, `code`, `settings`, `box`.
