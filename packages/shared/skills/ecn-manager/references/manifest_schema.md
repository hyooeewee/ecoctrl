# Manifest Schema Reference

`manifest.json` defines the plugin's identity and entry points. Validated by Zod in `plugin-loader.ts`.

## Fields

| Field              | Type   | Required | Description                                                       |
| ------------------ | ------ | -------- | ----------------------------------------------------------------- |
| `id`               | string | **Yes**  | Kebab-case identifier: `^[a-z0-9_-]+$`. Example: `energy-monitor` |
| `name`             | string | **Yes**  | Human-readable display name. Shown in the node palette.           |
| `version`          | string | **Yes**  | Semver: `^\d+\.\d+\.\d+$`. Example: `1.0.0`                       |
| `category`         | enum   | **Yes**  | One of: `trigger`, `action`, `condition`                          |
| `description`      | string | No       | Shown in node tooltip and docs.                                   |
| `entry`            | string | No       | JS entry file. Default: `backend.js`                              |
| `schema`           | string | No       | JSON Schema file for config form. Default: `schema.json`          |
| `icon`             | string | No       | SVG icon filename. Shown in the workflow editor.                  |
| `author`           | string | No       | Plugin author name.                                               |
| `minEngineVersion` | string | No       | Minimum EcoCtrl engine version required.                          |

## Example

```json
{
  "id": "http-request",
  "name": "HTTP Request",
  "version": "1.2.0",
  "category": "action",
  "description": "Send HTTP requests to external APIs",
  "entry": "backend.js",
  "schema": "schema.json",
  "icon": "icon.svg",
  "author": "EcoCtrl Team"
}
```
