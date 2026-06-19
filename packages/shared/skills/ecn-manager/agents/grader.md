# ECN Grader

Evaluate the quality of a generated `.ecn` plugin node.

## Checks

1. **Manifest correctness**
   - `id` matches `^[a-z0-9_-]+$`
   - `version` matches semver `^\d+\.\d+\.\d+$`
   - `category` is one of: trigger, action, condition
   - All required fields present (id, name, version, category)
   - `entry` is `"backend.js"`
   - `schema` is `"schema.json"`
   - `icon` file exists and is valid SVG

2. **Schema validity**
   - Valid JSON
   - Top-level `type` is `"object"`
   - Has `properties` field with at least one property
   - Each property has `type` and `title`
   - `required` array lists only keys that exist in `properties`
   - `enum` fields have non-empty arrays

3. **Backend.js quality**
   - Exports via `module.exports = async function execute(ctx, api)`
   - Uses only APIs documented in PluginApi reference
   - Does not use undeclared variables or Node.js built-ins not in the sandbox
   - Handles errors gracefully (try/catch or safe fallbacks)
   - Returns a value object

4. **Semantic correctness**
   - The backend.js actually does what the manifest description claims
   - Config fields in schema.json are used in backend.js via `ctx.config`
   - Category matches behavior (trigger = initiates workflow, action = performs work, condition = returns boolean)

5. **Security**
   - No hardcoded secrets or credentials
   - No dynamic code evaluation (eval, Function, etc.)
   - HTTP calls use safe URLs (not internal addresses)

6. **Built-in node quality** (when generating built-in nodes)
   - Named export function: `async function execute(ctx, api)` (not anonymous)
   - Structured logging with `[node_id]` prefix on every log line
   - Input validation: required fields checked before use
   - Type coercion: `String()`, `Number()`, `Boolean()` on config values
   - Try/catch with `{ cause: err }` chaining on I/O operations
   - Chinese user-facing error messages (in `throw new Error(...)`)
   - Schema has `outputs` section defining downstream-accessible fields
   - Enum fields validated before use
   - Numeric values clamped to safe bounds where applicable
   - No bare `console.log` — use `api.log.info/warn/error` only

## Output Format

Return a JSON object:

```json
{
  "passed": true,
  "score": 8.5,
  "checks": [
    { "name": "Manifest correctness", "passed": true, "notes": "" },
    { "name": "Schema validity", "passed": true, "notes": "" },
    { "name": "Backend.js quality", "passed": true, "notes": "Good error handling" },
    {
      "name": "Semantic correctness",
      "passed": false,
      "notes": "Description says 'send email' but backend.js does HTTP GET"
    },
    { "name": "Security", "passed": true, "notes": "" },
    {
      "name": "Built-in node quality",
      "passed": false,
      "notes": "Missing [node_id] log prefix, no input validation on required fields"
    }
  ],
  "suggestions": [
    "Fix the backend.js to match the described behavior",
    "Add [node_id] prefix to all log statements",
    "Validate required fields with api.log.error before use",
    "Add timeout to the HTTP call"
  ]
}
```

## Scoring Guide

| Score | Meaning                                                  |
| ----- | -------------------------------------------------------- |
| 9-10  | Production-ready, all checks pass, robust error handling |
| 7-8   | Good quality, minor improvements possible                |
| 5-6   | Functional but missing validation or error handling      |
| 3-4   | Significant issues, likely to fail at runtime            |
| 1-2   | Broken or non-functional                                 |
