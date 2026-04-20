import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { ProgressTrack, ProgressIndicator } from "@ecoctrl/ui";
import { cn } from "@/lib/utils";

interface ProgressProps extends ProgressPrimitive.Root.Props {
  indicatorClassName?: string;
}

export function Progress({
  className,
  indicatorClassName,
  value,
  children,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator className={indicatorClassName} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}
