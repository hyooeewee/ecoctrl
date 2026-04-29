# apps/web

See [root CLAUDE.md](../../CLAUDE.md) for global rules.

React Router 7 dashboard with 3D building visualization via BabylonJS.

## Constraints

- **Do not modify `app/components/ui/` directly.** These are generated shadcn/ui base components. Create wrappers in `app/components/` instead.
- **Do not format or lint `app/components/` automatically.** Excluded from `vp fmt` and `vp lint`.
- Import from `vite-plus`, not `vite` or `vitest`.
- Tailwind v4 is CSS-native — theme config lives in `app/app.css`, no `tailwind.config.js`.

## Conventions

- Use `~/` aliases, never deep relative imports.
- Use `@tabler/icons-react` for all icons.
- Add shadcn components via `vp dlx shadcn add <component>`.
- Update i18n keys when user-facing text changes.
- Run `uv run scripts/check-locale-dead-code.py` after modifying `app/locales/`.
- Remove dead code, unused constants, and orphaned i18n keys when replacing hard-coded values.
