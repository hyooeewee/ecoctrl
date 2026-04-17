# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EcoCtrl 能管平台** is an energy management platform admin dashboard. It's a React 19 SPA built with Vite, Tailwind CSS v4, and shadcn/ui (base-nova style).

## Common Commands

- **Install dependencies**: `pnpm install`
- **Start dev server**: `pnpm dev` (runs on port 3000)
- **Build for production**: `pnpm build`
- **Preview production build**: `pnpm preview`
- **Type check**: `pnpm lint` (runs `tsc --noEmit`)
- **Clean dist**: `pnpm clean`

No test runner is currently configured.

## Architecture

### Routing
This is a single-page app **without React Router**. Navigation is handled via tab state in `src/App.tsx`:
- `App.tsx` holds `activeTab` state and renders the matching page component via a `switch` statement.
- `src/components/Sidebar.tsx` defines the 10 nav items (ids: `dashboard`, `config`, `accounts`, `models`, `settingsGroup`, `monitoring`, `reports`, `maintenance`, `faults`, `energy`).
- Each tab maps 1:1 to a component in `src/pages/`.

### Directory Structure
- `src/pages/` — Page-level components (one per sidebar tab).
- `src/components/` — App-specific components (e.g., `Sidebar.tsx`, `Header.tsx`, `BrandLogo.tsx`).
- `components/ui/` — shadcn/ui base components (e.g., `button.tsx`, `card.tsx`).
- `src/constants/mockData.ts` — All current data is mock/static.
- `src/types.ts` — Shared TypeScript interfaces.
- `lib/utils.ts` — `cn()` utility for Tailwind class merging.

### Path Aliases
- `@/` maps to the repository root. Example: `import { Button } from '@/components/ui/button'`.

### Styling
- Tailwind CSS v4 is used with the `@tailwindcss/vite` plugin.
- Theme CSS variables are defined in `src/index.css` (light + dark mode).
- Font: `Geist Variable` via `@fontsource-variable/geist`.
- Animation library: `motion` (Framer Motion).
- Charts: `recharts`.

### Build-time Environment
- `vite.config.ts` loads `.env` files and injects `process.env.GEMINI_API_KEY` at build time.
- HMR can be disabled via the `DISABLE_HMR` env variable (used when running in AI Studio).
