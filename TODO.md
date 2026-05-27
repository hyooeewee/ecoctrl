# Models.tsx Form Migration

## Problem

`apps/admin/src/pages/Models.tsx` is 1971 lines with 30+ `useState` hooks managing 6 form dialogs. Form state, validation, and error handling are scattered and repetitive.

## Goal

Migrate to React Hook Form + Zod to consolidate form state and replace handwritten validation logic.

## Tasks

- [ ] Extract 6 dialogs into separate component files
- [ ] Migrate forms to RHF + Zod (validation schemas + `z.refine` for uniqueness checks)
- [ ] Remove dead useState and manual validation functions

## References

- React Hook Form: https://react-hook-form.com
- Zod: https://zod.dev
- shadcn/ui Form: `pnpm dlx shadcn@latest add form`
