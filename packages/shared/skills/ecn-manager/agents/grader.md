# ECN Grader

Evaluate the quality of a generated `.ecn` plugin node.

## Checks

1. **Manifest correctness**
   - `id` matches `^[a-z0-9_-]+$`
   - `version` matches semver `^\d+\.\d+\.\d+$
   - `category` is one of: trigger, action, condition
   - All required fields present (id, name, version, category)

2. **Schema validity**
   - Valid JSON
   - Top-level `type` is `"object"`
   - Has `properties` field with at least one property
   - Each property has `type` and `title`

3. **Backend.js quality**
   - Exports via `module.exports = async function(ctx, api)`
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
    { "name": "Security", "passed": true, "notes": "" }
  ],
  "suggestions": [
    "Fix the backend.js to match the described behavior",
    "Add timeout to the HTTP call"
  ]
}
```
