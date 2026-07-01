# UI 组件库

`packages/ui` 是 `apps/admin` 和 `apps/web` 共享的组件库。它基于 [Base UI](https://base-ui.com/)（Radix v2）构建，使用 Tailwind CSS v4 + `class-variance-authority` 进行样式处理。

## 关键特性：源码分发

与大多数 UI 库不同，`@ecoctrl/ui` **不**提供编译后的包。消费应用直接导入 TypeScript 源码：

```tsx
import { Button, Dialog, Input } from "@ecoctrl/ui";
```

`@ecoctrl/shared` 中的 `resolveUiAlias()` 插件将库内部的 `@/` 别名重写回 `packages/ui/src/`，让消费应用的打包器一起编译。这意味着：

- **库零构建步骤** — 编辑组件后，所有应用下次热更新时自动生效。
- **Tree-shaking 友好** — 只有导入的组件会进入最终包。
- **类型安全** — TypeScript 定义直接从源码推断。

## 添加 shadcn 组件

库维护了 shadcn 风格的基础组件。添加方式：

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component-name> -y
pnpm generate-proxies
```

`generate-proxies` 更新 `package.json` 的 exports，使子路径导入生效：

```tsx
import { Field } from "@ecoctrl/ui/field";
import { buttonVariants } from "@ecoctrl/ui/button";
```

## 添加自定义组件

对于不属于 shadcn 的项目专属组件：

1. 在 `packages/ui/src/components/community/` 中创建组件。
2. 从 `packages/ui/src/index.ts` 导出。
3. 运行 `pnpm generate-proxies`。

示例：

```tsx
// packages/ui/src/components/community/autocomplete.tsx
import { useState } from "react";

export function Autocomplete({ options, onSelect }) {
  // ...实现
}
```

## 组件约定

| 模式     | 规则                                        |
| -------- | ------------------------------------------- |
| 类名合并 | 始终使用 `@/lib/utils` 中的 `cn()`          |
| 变体     | 使用 `cva` 为带样式变体的组件               |
| 样式钩子 | 在根元素上添加 `data-slot="component-name"` |
| 导出     | 命名导出；复合组件导出所有子部分            |
| 图标     | 使用 `lucide-react`                         |

组件示例：

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

## UI Adapter 模式

应用应**永远不要**直接修改 `packages/ui/src/components/ui/` 中生成的 shadcn 基础组件。而是在应用自己的目录中创建适配器：

```tsx
// apps/web/app/components/ui-adapter/button.tsx
import { Button as BaseButton } from "@ecoctrl/ui";

export function Button(props) {
  return <BaseButton {...props} className="my-app-specific-class" />;
}
```

这保持了库的干净，同时允许每个应用进行定制。

## 可用组件

从 monorepo 根目录运行以下命令查看当前组件列表：

```bash
ls packages/ui/src/components/ui/
ls packages/ui/src/components/community/
```

常用组件包括：`button`、`dialog`、`input`、`select`、`table`、`card`、`badge`、`avatar`、`tooltip`、`popover`、`sheet`、`scroll-area`、`command`、`combobox`、`switch`、`slider`、`toggle`、`dropdown-menu`、`separator`、`progress`、`skeleton`、`tabs`、`textarea`、`field`、`label`、`sonner`。
