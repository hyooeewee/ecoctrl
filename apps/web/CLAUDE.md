# ecoctrl-web

A React Router 7 dashboard application with 3D building visualization via BabylonJS.

## 交互规则

- 任何编码或修改前，必须先输出执行计划。
- 计划需包含：
  - 涉及的文件列表（路径）。
  - 每个文件的拟操作（创建/修改/删除）。
- 输出计划后，明确请求确认（如："确认后开始执行。"）。
- 仅在收到"确认""可以"或"执行"后，方可动手。

## Stack

- **Framework:** React Router 7 (framework mode), React 19
- **Styling:** Tailwind CSS v4, `tw-animate-css`
- **Components:** shadcn/ui (`base-nova` style)
- **3D:** BabylonJS v9
- **Icons:** Tabler Icons (`@tabler/icons-react`)
- **Tooling:** Vite+ (wraps Vite, Vitest, Oxlint, Oxfmt)

## Common Commands

Use `vp` for all operations. Do not use `pnpm`, `npm`, `npx`, or `dlx` directly.

```bash
vp install          # Install dependencies
vp dev              # Start dev server
vp check            # Format + lint + type check
vp test             # Run tests
vp build            # Production build
vp dlx <pkg>        # Run one-off binaries
```

## Project Structure

```
app/
  components/       # UI components (shadcn/ui components live here)
  hooks/            # Custom React hooks
  lib/              # Utility functions
  locales/          # i18n translation files
  routes/           # React Router route modules
  app.css           # Global styles + Tailwind theme config
  root.tsx
  routes.ts
```

## Import Aliases

- `~/components` — React components
- `~/components/ui` — shadcn/ui components
- `~/lib` — Utilities
- `~/hooks` — Custom hooks

## Critical Constraints

- **Do not modify `app/components/ui/` directly.** These are generated shadcn/ui base components. If you need to customize behavior or styling, create a wrapper in `app/components/` and compose from there.
- **Do not format or lint `app/components/` automatically.** This directory is excluded from `vp fmt` and `vp lint` in `vite.config.ts`.
- **Import from `vite-plus`**, not `vite` or `vitest`. Example: `import { defineConfig } from 'vite-plus'`.
- **Tailwind v4 is CSS-native.** Theme configuration lives in `app/app.css`; do not create a `tailwind.config.js`.

## Adding shadcn/ui Components

```bash
vp dlx shadcn add <component>
```

Use `@tabler/icons-react` for all icons.

## Agent Checklist

- [ ] Run `vp install` after pulling changes.
- [ ] Run `vp check` and `vp test` before finishing.
- [ ] Do not touch formatting in `app/components/`.
- [ ] Use `~/` aliases instead of deep relative imports.
- [ ] Update i18n keys if user-facing text changes.
- [ ] Run `uv run scripts/check-locale-dead-code.py` after modifying `app/locales/` to ensure no orphaned keys.
- [ ] Remove dead code, unused constants, and orphaned i18n keys when replacing hard-coded values. Do not leave tails behind.

## 工作范围

- 仅修改 `apps/web` 内文件；`packages/*`、`apps/admin` 、`./` 等其他目录只读并且积极获取最新的状态，如需修改请给出修改建议。
