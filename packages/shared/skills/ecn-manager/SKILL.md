---
name: ecn-manager
description: Create, modify, and validate EcoCtrl .ecn plugin node packages. Use whenever the user wants to build a custom workflow node, edit an existing plugin, or validate a .ecn file. Also use when the user mentions 'plugin node', 'custom node', 'workflow node', '.ecn file', or wants to extend the workflow engine with new actions, triggers, or conditions.
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

Ask the user:

1. What should this node do? (read sensor, call API, send email, etc.)
2. What category? (`trigger`, `action`, or `condition`)
3. What config fields does it need? (endpoint URL, threshold value, etc.)
4. Is this a new node or modifying an existing one?

### 2. Scaffold (new node)

Use the bundled script to scaffold:

```bash
python <skill-path>/scripts/create_ecn.py <output-directory>
```

This interactively prompts for metadata and generates:

- `manifest.json` — with proper id, name, version, category
- `backend.js` — with the PluginApi import comment and skeleton function
- `schema.json` — with user-defined config fields

### 3. Implement backend.js

Edit the generated `backend.js` to implement the node's logic. Use the PluginApi reference (see `references/plugin_api_reference.md`) for available APIs.

Key rules:

- Must export via `module.exports = async function(ctx, api) { ... }`
- `ctx.config` contains values from the node's config form (defined by schema.json)
- Return an object — it becomes the node's output for downstream nodes
- Use `api.log.info/warn/error` for debugging
- Handle errors gracefully; uncaught errors fail the workflow execution

### 4. Validate

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

### 5. Package / Extract (round-trip editing)

**Extract for editing:**

```bash
python <skill-path>/scripts/extract_ecn.py <plugin.ecn> <output-directory>
```

**Re-package after edits:**

```bash
python <skill-path>/scripts/package_ecn.py <source-directory> [output.ecn]
```

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
