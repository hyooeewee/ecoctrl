# packages/ui

See [root CLAUDE.md](../../CLAUDE.md) for global rules.

Internal UI component library. No build step — consuming apps transpile TSX source directly.

## Constraints

- Base-luma style: large rounded corners (`rounded-4xl`), `oklch()` CSS variables, Inter + Roboto fonts.
- Primitives: `@base-ui/react` (Radix v2).
- Styling via Tailwind CSS v4 + `class-variance-authority`.
- Do not modify generated shadcn/ui base components directly.

## Conventions

| Pattern       | Rule                                                    |
| ------------- | ------------------------------------------------------- |
| Class merging | Always use `cn()` from `@/lib/utils`                    |
| Variants      | Use `cva` for components with style variants            |
| Styling hooks | Add `data-slot="component-name"` to root elements       |
| Exports       | Named exports; compound components export all sub-parts |
| Icons         | Use `lucide-react`                                      |

### Usage

```tsx
import { Button, Dialog, Input, useTheme } from "@ecoctrl/ui";
```

Subpath imports (tree-shaking friendly):

```tsx
import { Field } from "@ecoctrl/ui/field";
import { buttonVariants } from "@ecoctrl/ui/button";
import { cn } from "@ecoctrl/ui/utils";
```

Apps can customize defaults via UI Adapter pattern — wrap base components in app-specific overrides without modifying the library.

### Adding Components

```bash
pnpm dlx shadcn@latest add <name> -y && pnpm generate-proxies
```

Custom components: create in `src/components/ui/` or `src/components/community/`, then run `pnpm generate-proxies` to sync `package.json` exports.
