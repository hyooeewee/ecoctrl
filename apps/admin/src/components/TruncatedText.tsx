import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ecoctrl/ui";

interface TruncatedTextProps {
  text: string;
  className?: string;
  showTooltip?: boolean;
}

export default function TruncatedText({ text, className, showTooltip = true }: TruncatedTextProps) {
  if (!text) return null;

  const content = (
    <span className={cn("truncate", className)} title={!showTooltip ? text : undefined}>
      {text}
    </span>
  );

  if (!showTooltip) return content;

  return (
    <TooltipProvider {...({ delayDuration: 300 } as any)}>
      <Tooltip>
        <TooltipTrigger {...({ asChild: true } as any)}>{content}</TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
