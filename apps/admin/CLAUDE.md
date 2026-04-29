# apps/admin

See [root CLAUDE.md](../../CLAUDE.md) for global rules.

React 19 SPA dashboard for EcoCtrl. Built with vite-plus, Tailwind CSS v4, shadcn/ui (base-nova style).

## Constraints

- **Do not modify `components/ui/` directly.** These are generated shadcn/ui base components. Create wrappers in `src/components/` instead.
- **Do not format or lint `app/components/` automatically.** This directory is excluded from `vp fmt` and `vp lint`.
- Import from `vite-plus`, not `vite` or `vitest`.
- Tailwind v4 is CSS-native — theme config lives in `src/index.css`, no `tailwind.config.js`.
- This is a single-page app without React Router. Navigation is tab state in `src/App.tsx`.

## Conventions

- Use `@/` aliases, never deep relative imports.
- Use `Geist Variable` font. Charts via `recharts`. Animation via `motion`.
- Update i18n keys when user-facing text changes.
- Run `uv run scripts/check-locale-dead-code.py` after modifying `src/locales/`.
- Remove dead code, unused constants, and orphaned i18n keys when replacing hard-coded values.
