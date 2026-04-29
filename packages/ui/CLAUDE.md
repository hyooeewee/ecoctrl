# @ecoctrl/ui

Internal UI component library for the ecoctrl monorepo.

## Architecture

- **No build step** — `package.json` points `main`/`types` directly to `./src/index.ts`. Consuming apps transpile the TSX source.
- **Base-luma style** — shadcn/ui with large rounded corners (`rounded-4xl`), `oklch()` CSS variables, Inter + Roboto fonts.
- **Primitives** — `@base-ui/react` (Radix v2). Styling via Tailwind CSS v4 + `class-variance-authority`.

## Directory Layout

```
src/
├── index.ts                 # Barrel exports
├── index.css                # Tailwind entry + theme variables
├── lib/
│   └── utils.ts             # `cn()` = clsx + tailwind-merge
├── components/
│   ├── theme-provider.tsx   # Custom theme provider (D key to toggle)
│   ├── ui/                  # 27 shadcn components
│   └── community/           # Custom components (e.g. autocomplete)
```

## Usage

### Barrel import (existing)

```tsx
import { Button, Dialog, Input, useTheme } from "@ecoctrl/ui";
```

### Subpath import (tree-shaking friendly)

```tsx
import { Field } from "@ecoctrl/ui/field";
import { buttonVariants } from "@ecoctrl/ui/button";
import { Autocomplete } from "@ecoctrl/ui/autocomplete";
import { cn } from "@ecoctrl/ui/utils";
```

Wrap app root with `ThemeProvider` for dark/light/system support.

### UI Adapter Pattern

Apps can customize defaults without modifying the library. Example from `apps/web`:

```tsx
import { Button as BaseButton } from "@ecoctrl/ui";

function Button({ className, ...props }) {
  return <BaseButton className={cn("rounded-lg h-8", className)} {...props} />;
}
```

## Adding Components

### Add a single component

```bash
pnpm dlx shadcn@latest add <name> -y && pnpm generate-proxies
```

### Custom component

1. Create in `src/components/ui/` or `src/components/community/`
2. Follow existing patterns (see below)
3. Run `pnpm generate-proxies` to sync `package.json` exports

## Coding Conventions

| Pattern       | Rule                                                    |
| ------------- | ------------------------------------------------------- |
| Class merging | Always use `cn()` from `@/lib/utils`                    |
| Variants      | Use `cva` for components with style variants            |
| Styling hooks | Add `data-slot="component-name"` to root elements       |
| Exports       | Named exports; compound components export all sub-parts |
| Icons         | Use `lucide-react`                                      |
