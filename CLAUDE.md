# EcoCtrl Monorepo

Energy management platform. Monorepo with `apps/*` and `packages/*`.

## Projects

| Project           | Description                   | Docs                                     |
| ----------------- | ----------------------------- | ---------------------------------------- |
| `apps/admin`      | React 19 SPA dashboard        | [CLAUDE.md](./apps/admin/CLAUDE.md)      |
| `apps/web`        | React Router 7 + BabylonJS 3D | [CLAUDE.md](./apps/web/CLAUDE.md)        |
| `packages/server` | Fastify 5 + Drizzle ORM API   | [CLAUDE.md](./packages/server/CLAUDE.md) |
| `packages/shared` | Shared types & tsconfig       | [CLAUDE.md](./packages/shared/CLAUDE.md) |
| `packages/ui`     | shadcn/ui component library   | [CLAUDE.md](./packages/ui/CLAUDE.md)     |

## Rules

1. **Plan first.** Before any code change, output an execution plan with affected files and intended actions. Wait for explicit confirmation ("确认", "可以", or "执行") before proceeding.
2. **Respect scope.** Only modify files within the current working directory. Cross-package changes require a root-level plan.
3. **Check before finish.** Run `pnpm -w check:fix` before concluding work.
