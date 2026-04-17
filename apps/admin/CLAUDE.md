# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EcoCtrl 能管平台** is an energy management platform admin dashboard. It's a React 19 SPA built with **vite-plus** (`vp`), Tailwind CSS v4, and shadcn/ui (base-nova style).

## Common Commands

- **Install dependencies**: `pnpm install`
- **Start dev server**: `pnpm dev` (runs on port 3000)
- **Build for production**: `pnpm build`
- **Preview production build**: `pnpm preview`
- **Format + lint + type check**: `pnpm lint` (runs `vp check`)
- **Clean dist**: `pnpm clean`

No test runner is currently configured.

## Architecture

### Routing

This is a single-page app **without React Router**. Navigation is handled via tab state in `src/App.tsx`:

- `App.tsx` holds `activeTab` state and renders the matching page component via a `switch` statement.
- `src/components/Sidebar.tsx` defines the 10 nav items (ids: `dashboard`, `config`, `accounts`, `models`, `settingsGroup`, `monitoring`, `reports`, `maintenance`, `faults`, `energy`).
- Each tab maps 1:1 to a component in `src/pages/`.

### Key Directories

- `src/pages/` — Page-level components (one per sidebar tab).
- `src/components/` — App-specific components (`Sidebar`, `Header`, `BrandLogo`).
- `components/ui/` — shadcn/ui base components.
- `src/constants/mockData.ts` — All current data is mock/static.
- `src/types.ts` — Shared TypeScript interfaces.
- `lib/utils.ts` — `cn()` utility for Tailwind class merging.

### Path Aliases

- `@/` maps to the repository root.

### Styling

- Tailwind CSS v4 with `@tailwindcss/vite`.
- Theme CSS variables in `src/index.css` (light + dark mode).
- Font: `Geist Variable`.
- Animation: `motion`.
- Charts: `recharts`.

### Build & Tooling

- `vite.config.ts` imports `defineConfig` / `loadEnv` from **`vite-plus`**.
- `vite-plus` bundles Vite v8, Rolldown, Vitest, oxlint, and oxfmt.
- `.vite-hooks/pre-commit` runs `vp check --fix` on staged files.
- `vite.config.ts` injects `process.env.GEMINI_API_KEY` at build time.
- HMR can be disabled via `DISABLE_HMR`.

## 交互规则

- 任何编码或修改前，必须先输出执行计划。
- 计划需包含：
  - 涉及的文件列表（路径）。
  - 每个文件的拟操作（创建 / 修改 / 删除）。
- 输出计划后，明确请求确认（如："确认后开始执行。"）。
- 仅在收到 "确认""可以" 或 "执行" 后，方可动手。
