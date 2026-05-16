# Monorepo Structure

EcoCtrl is a [pnpm](https://pnpm.io/) workspace with three apps and three packages. This page explains the non-obvious choices behind the layout — what is special about the `vite` dependency, why `@ecoctrl/ui` ships source files instead of a build, and how versions stay in sync.

## Workspace layout

```
ecoctrl/
├── apps/
│   ├── admin/          # React 19 admin dashboard (Tab-based SPA)
│   ├── web/            # React Router 7 + Babylon.js public portal
│   └── docs/           # VitePress 2 documentation site
├── packages/
│   ├── server/         # Fastify 5 REST API
│   ├── ui/             # Shared component library (shadcn/ui style, source-only)
│   └── shared/         # Zod schemas, types, and Vite tooling
├── docker/             # Compose manifests and per-app Dockerfiles
├── scripts/            # start.mjs and runtime helpers shipped with releases
└── pnpm-workspace.yaml
```

`pnpm-workspace.yaml` declares both `apps/*` and `packages/*` as workspaces. Cross-package imports use the published name (`@ecoctrl/ui`, `@ecoctrl/shared`, etc.) and resolve to the local sources during development.

## Catalog-pinned dependencies

The workspace uses [pnpm catalogs](https://pnpm.io/catalogs) to pin shared dependency versions in one place:

```yaml
catalog:
  "@base-ui/react": ^1.4.0
  react: ^19.2.5
  react-dom: ^19.2.5
  tailwindcss: ^4.2.2
  recharts: ^3.8.1
  vite: npm:@voidzero-dev/vite-plus-core@^0.1.18
  vitest: npm:@voidzero-dev/vite-plus-test@latest
overrides:
  vite: "catalog:"
  vitest: "catalog:"
```

Two things are worth highlighting:

1. **`vite` is not Vite.** It is aliased to `@voidzero-dev/vite-plus-core` — Voidzero's "Vite Plus" distribution. Every package that imports from `vite` actually loads vite-plus. The `overrides` section forces the same alias even for transitive dependencies.
2. **Adding or upgrading a shared dependency** is a one-line change in `pnpm-workspace.yaml`. Each app then references it with `"react": "catalog:"` in its own `package.json`.

### What is vite-plus?

vite-plus is a Voidzero-distributed superset of Vite that ships:

- **`vp`**, an opinionated CLI bundling `dev`, `build`, `check`, `fmt` and `lint`. Both `apps/admin` and `apps/web` use `vp dev` and `vp build` instead of plain `vite`.
- **Rolldown** as the bundler, accelerating production builds.
- **OXC** for linting and formatting.

Because the API surface is compatible with Vite's, plugins such as `@vitejs/plugin-react` and `@tailwindcss/vite` continue to work unmodified.

## Shared utilities (`@ecoctrl/shared`)

`packages/shared` exposes:

- **Zod schemas** under `types/api/` — used by the server for request/response validation and by the frontends for type-safe fetch clients. Sharing the same `z.infer` types ensures the contract cannot drift.
- **`createDevProxy(apiBaseUrl, options?)`** — returns a Vite `server.proxy` block that forwards `/api` and `/static` to the API only when the URL is `localhost`. In production the rewrite happens at the reverse proxy layer instead.
- **`resolveUiAlias()`** — a Vite plugin that fixes `@/` imports across the package boundary; see below.
- **`viteConfig`** — the default base config used by every frontend app, wiring up TailwindCSS, sort-imports, lint, format and type checks.

## The `@ecoctrl/ui` package — source-distributed

Most workspace UI libraries ship a compiled bundle under `dist/`. `@ecoctrl/ui` does **not**:

```jsonc
// packages/ui/package.json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./index.css": "./src/index.css",
  },
}
```

The library exports `cn`, `ThemeProvider`, and a curated set of shadcn-style components built on top of [Base UI](https://base-ui.com/). They are imported as TypeScript source and bundled by each consuming app.

### Why a Vite plugin is needed

When `apps/admin/src/somewhere.tsx` imports from `@ecoctrl/ui`, that source still contains relative aliases like `@/lib/utils`. From admin's perspective `@` points to admin's own `src/`, not to ui's. The `resolveUiAlias()` plugin in `@ecoctrl/shared` rewrites those aliases back to the ui package's own `src/` and tries each TypeScript extension explicitly (Rolldown does not auto-probe extensions in production). Both `apps/admin` and `apps/web` already include it in their `vite.config.ts`.

The practical implication: **whenever you edit something in `packages/ui`, the change is picked up by every consuming app on the next reload — no build step required.**

## Server build: Rolldown with auto-emitted `dist/package.json`

`packages/server` is bundled by [Rolldown](https://rolldown.rs/). Its config (`rolldown.config.ts`) externalizes every bare specifier and Node built-in, so the resulting `dist/index.mjs` is a thin entry point that imports from `node_modules/`.

A custom plugin scans the bundle's external imports, looks up each version from the source `package.json`, and emits a fresh `dist/package.json` listing only the runtime dependencies. The release zip therefore contains a self-contained server bundle that any host can install with a plain `pnpm install --prod`.

## Versioning with Changesets

The repo uses [Changesets](https://github.com/changesets/changesets) for versioning. Two configuration choices are worth knowing:

- **Fixed packages**: `@ecoctrl/admin`, `@ecoctrl/web` and `@ecoctrl/server` share the same version number — bumping any one of them bumps all three. Release zip filenames are derived from this shared version.
- **Ignored packages**: `@ecoctrl/ui` and `@ecoctrl/shared` do not participate in versioning. They evolve continuously alongside the apps that consume them.

Create a changeset before opening a PR with user-visible changes:

```bash
pnpm changeset
# pick the affected package(s), describe the change, commit the markdown.
```

The release workflow (see [Deployment](/reference/deployment)) takes care of bumping versions, generating the changelog and publishing the release.

## Path aliases recap

| App               | Alias             | Resolves to                                          |
| ----------------- | ----------------- | ---------------------------------------------------- |
| `apps/admin`      | `@/`              | `apps/admin/src/`                                    |
| `apps/web`        | `~/`              | `apps/web/app/`                                      |
| `apps/web`        | `~/components/ui` | `apps/web/app/components/ui` (project shadcn copies) |
| `packages/server` | `@/`              | `packages/server/src/`                               |
| `packages/ui`     | `@/`              | `packages/ui/src/` (rewritten by `resolveUiAlias()`) |

If you encounter `@/` inside a `@ecoctrl/ui` source file, that is the case `resolveUiAlias()` handles for you — do not change it.

## `@ecoctrl/ui` — the shared component library

`packages/ui` is a **source-distributed** UI library built on top of [Base UI](https://base-ui.com/) (Radix v2) and styled with Tailwind CSS v4 + `class-variance-authority`.

### Adding a shadcn component

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component-name> -y
pnpm generate-proxies
```

`generate-proxies` syncs the `package.json` `exports` field so consumers can import subpaths like `@ecoctrl/ui/button`.

### Adding a custom component

Create in `src/components/ui/` (shadcn base) or `src/components/community/` (project-specific). Then run `pnpm generate-proxies`.

### Conventions

- Use `cn()` from `@/lib/utils` for class merging.
- Use `cva` for components with style variants.
- Add `data-slot="component-name"` to root elements.
- Export named exports; compound components export all sub-parts.
- Icons come from `lucide-react`.

### UI Adapter pattern

Apps should not modify generated shadcn base components directly. Instead, create wrappers in the app's own `components/` directory. This keeps the library clean while allowing per-app customization.

## `@ecoctrl/shared` — shared infrastructure

`packages/shared` exposes:

- **TypeScript configs** (`tsconfig.base.json`, `tsconfig.app.json`, `tsconfig.node.json`) used by every app.
- **Vite base config** (`vite.config.base.ts`) wiring Tailwind, sort-imports, lint, format and type checks.
- **Zod schemas** under `types/api/` — shared request/response types between server and frontends.
- **`createDevProxy()`** — Vite proxy block that forwards `/api` and `/static` to the API only on `localhost`.
- **`resolveUiAlias()`** — Vite plugin that rewrites `@/` inside `@ecoctrl/ui` source back to the ui package's own `src/`.
- **`gen-env-example.ts`** — script that generates `.env.example` files from `.env.local` comments, used by `env:sync` and `env:check` scripts in every package.
