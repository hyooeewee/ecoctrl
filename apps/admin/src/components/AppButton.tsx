/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button } from "@ecoctrl/ui";
import type { ComponentProps } from "react";

type AppButtonProps = Omit<ComponentProps<typeof Button>, "variant"> & {
  level?: "primary" | "action" | "secondary" | "danger" | "ghost";
};

/**
 * Semantic button wrapper that maps levels to shadcn/ui variants with
 * consistent styling across the app.
 *
 * Levels:
 * - primary:   Solid primary — only for the single most important action on a page
 * - action:    Bordered primary that fills on hover — for form submit, confirm, save
 * - secondary: Bordered neutral — for cancel, export, back
 * - danger:    Low-saturation destructive — for delete, unlink, remove
 * - ghost:     Transparent with hover bg — for icon buttons, edit, toggle
 */
export default function AppButton({ level = "action", className = "", ...props }: AppButtonProps) {
  const levelStyles: Record<string, string> = {
    primary:
      "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80",
    action:
      "border-primary/60 bg-background text-primary hover:border-primary hover:bg-primary/5 hover:text-primary active:bg-primary/10",
    secondary:
      "border-border bg-background text-foreground hover:bg-muted hover:text-foreground active:bg-muted/80",
    danger:
      "border-transparent bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 active:bg-red-200 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60",
    ghost: "text-foreground hover:bg-muted active:bg-muted/70",
  };

  return <Button className={`${levelStyles[level]} ${className}`} {...props} />;
}
