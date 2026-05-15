# UI Library

`packages/ui` is the shared component library used by both `apps/admin` and `apps/web`. It is built on top of [Base UI](https://base-ui.com/) (Radix v2) and styled with Tailwind CSS v4 + `class-variance-authority`.

## Key characteristic: source-distributed

Unlike most UI libraries, `@ecoctrl/ui` does **not** ship a compiled bundle. Consuming apps import TypeScript source directly:

```tsx
import { Button, Dialog, Input } from "@ecoctrl/ui";
```

The `resolveUiAlias()` plugin in `@ecoctrl/shared` rewrites internal `@/` aliases inside the library back to `packages/ui/src/`, so the consuming app's bundler compiles everything together. This means:

- **Zero build step** for the library — edit a component and every app picks it up on the next reload.
- **Tree-shaking friendly** — only imported components end up in the bundle.
- **Type-safe** — TypeScript definitions are inferred directly from source.

## Adding a shadcn component

The library maintains shadcn-style base components. To add one:

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component-name> -y
pnpm generate-proxies
```

`generate-proxies` updates `package.json` exports so subpath imports work:

```tsx
import { Field } from "@ecoctrl/ui/field";
import { buttonVariants } from "@ecoctrl/ui/button";
```

## Adding a custom component

For project-specific components that are not part of shadcn:

1. Create the component in `packages/ui/src/components/community/`.
2. Export it from `packages/ui/src/index.ts`.
3. Run `pnpm generate-proxies`.

Example:

```tsx
// packages/ui/src/components/community/autocomplete.tsx
import { useState } from "react";

export function Autocomplete({ options, onSelect }) {
  // ...implementation
}
```

## Component conventions

| Pattern       | Rule                                                    |
| ------------- | ------------------------------------------------------- |
| Class merging | Always use `cn()` from `@/lib/utils`                    |
| Variants      | Use `cva` for components with style variants            |
| Styling hooks | Add `data-slot="component-name"` to root elements       |
| Exports       | Named exports; compound components export all sub-parts |
| Icons         | Use `lucide-react`                                      |

Example component:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

## UI Adapter pattern

Apps should **never** modify generated shadcn base components in `packages/ui/src/components/ui/` directly. Instead, create an adapter in the app's own directory:

```tsx
// apps/web/app/components/ui-adapter/button.tsx
import { Button as BaseButton } from "@ecoctrl/ui";

export function Button(props) {
  return <BaseButton {...props} className="my-app-specific-class" />;
}
```

This keeps the library clean while allowing per-app customization.

## Available components

Run this from the monorepo root to see the current component list:

```bash
ls packages/ui/src/components/ui/
ls packages/ui/src/components/community/
```

Common components include: `button`, `dialog`, `input`, `select`, `table`, `card`, `badge`, `avatar`, `tooltip`, `popover`, `sheet`, `scroll-area`, `command`, `combobox`, `switch`, `slider`, `toggle`, `dropdown-menu`, `separator`, `progress`, `skeleton`, `tabs`, `textarea`, `field`, `label`, `sonner`.
