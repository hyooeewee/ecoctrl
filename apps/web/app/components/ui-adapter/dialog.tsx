import {
  Dialog as BaseDialog,
  DialogTrigger as BaseDialogTrigger,
  DialogPortal as BaseDialogPortal,
  DialogClose as BaseDialogClose,
  DialogOverlay as BaseDialogOverlay,
  DialogContent as BaseDialogContent,
  DialogHeader as BaseDialogHeader,
  DialogFooter as BaseDialogFooter,
  DialogTitle as BaseDialogTitle,
  DialogDescription as BaseDialogDescription,
} from "@ecoctrl/ui";
import { cn } from "~/lib/utils";

function Dialog({ ...props }: React.ComponentProps<typeof BaseDialog>) {
  return <BaseDialog {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof BaseDialogTrigger>) {
  return <BaseDialogTrigger {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof BaseDialogPortal>) {
  return <BaseDialogPortal {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof BaseDialogClose>) {
  return <BaseDialogClose {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof BaseDialogOverlay>) {
  return (
    <BaseDialogOverlay
      className={cn("bg-black/10 supports-backdrop-filter:backdrop-blur-xs", className)}
      {...props}
    />
  );
}

function DialogContent({ className, ...props }: React.ComponentProps<typeof BaseDialogContent>) {
  return <BaseDialogContent className={cn("rounded-xl p-4", className)} {...props} />;
}

function DialogHeader({ className, ...props }: React.ComponentProps<typeof BaseDialogHeader>) {
  return <BaseDialogHeader className={cn("flex flex-col gap-2", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<typeof BaseDialogFooter>) {
  return (
    <BaseDialogFooter
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof BaseDialogTitle>) {
  return (
    <BaseDialogTitle
      className={cn("font-heading text-base leading-none font-medium", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialogDescription>) {
  return (
    <BaseDialogDescription
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
