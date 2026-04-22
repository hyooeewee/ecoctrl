import {
  Select as BaseSelect,
  SelectGroup as BaseSelectGroup,
  SelectValue as BaseSelectValue,
  SelectTrigger as BaseSelectTrigger,
  SelectContent as BaseSelectContent,
  SelectLabel as BaseSelectLabel,
  SelectItem as BaseSelectItem,
  SelectSeparator as BaseSelectSeparator,
  SelectScrollUpButton as BaseSelectScrollUpButton,
  SelectScrollDownButton as BaseSelectScrollDownButton,
} from "@ecoctrl/ui";
import { cn } from "~/lib/utils";

const Select = BaseSelect;

function SelectGroup({ className, ...props }: React.ComponentProps<typeof BaseSelectGroup>) {
  return <BaseSelectGroup className={cn("scroll-my-1 p-1", className)} {...props} />;
}

function SelectValue({ className, ...props }: React.ComponentProps<typeof BaseSelectValue>) {
  return <BaseSelectValue className={cn("flex flex-1 text-left", className)} {...props} />;
}

function SelectTrigger({ className, ...props }: React.ComponentProps<typeof BaseSelectTrigger>) {
  return (
    <BaseSelectTrigger
      className={cn(
        "rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm data-[size=default]:h-8 data-[size=sm]:h-7",
        className,
      )}
      {...props}
    />
  );
}

function SelectContent({ className, ...props }: React.ComponentProps<typeof BaseSelectContent>) {
  return (
    <BaseSelectContent
      className={cn("rounded-lg shadow-md ring-1 ring-foreground/10", className)}
      {...props}
    />
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof BaseSelectLabel>) {
  return (
    <BaseSelectLabel
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({ className, ...props }: React.ComponentProps<typeof BaseSelectItem>) {
  return (
    <BaseSelectItem
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelectSeparator>) {
  return (
    <BaseSelectSeparator
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelectScrollUpButton>) {
  return (
    <BaseSelectScrollUpButton
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1",
        className,
      )}
      {...props}
    />
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelectScrollDownButton>) {
  return (
    <BaseSelectScrollDownButton
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1",
        className,
      )}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
