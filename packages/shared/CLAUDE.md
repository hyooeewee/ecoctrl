# packages/shared

See [root CLAUDE.md](../../CLAUDE.md) for global rules.

Cross-app shared TypeScript package. Tsconfig templates and shared type definitions. No build step.

## Constraints

- No build step — this is a pure types + config package.
- Ensure type compatibility across all consuming packages after modifying types.

## Conventions

- Export via `package.json` `exports` field.
- Consuming packages reference via `"@ecoctrl/shared": "workspace:*"`.
- Config inheritance: `"extends": "@ecoctrl/shared/tsconfig.base.json"`.
- Type imports: `import type { SomeType } from "@ecoctrl/shared/types"`.
