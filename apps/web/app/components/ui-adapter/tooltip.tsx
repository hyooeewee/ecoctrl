import {
  Tooltip as BaseTooltip,
  TooltipTrigger as BaseTooltipTrigger,
  TooltipContent as BaseTooltipContent,
  TooltipProvider as BaseTooltipProvider,
} from "@ecoctrl/ui";
import { cn } from "~/lib/utils";

function TooltipProvider(props: React.ComponentProps<typeof BaseTooltipProvider>) {
  return <BaseTooltipProvider {...props} />;
}

function Tooltip(props: React.ComponentProps<typeof BaseTooltip>) {
  return <BaseTooltip {...props} />;
}

function TooltipTrigger(props: React.ComponentProps<typeof BaseTooltipTrigger>) {
  return <BaseTooltipTrigger {...props} />;
}

function TooltipContent({ className, ...props }: React.ComponentProps<typeof BaseTooltipContent>) {
  return <BaseTooltipContent className={cn("rounded-md", className)} {...props} />;
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
