import * as React from "react";
import {
  Sheet as BaseSheet,
  SheetClose as BaseSheetClose,
  SheetContent as BaseSheetContent,
  SheetDescription as BaseSheetDescription,
  SheetFooter as BaseSheetFooter,
  SheetHeader as BaseSheetHeader,
  SheetTitle as BaseSheetTitle,
  SheetTrigger as BaseSheetTrigger,
} from "@ecoctrl/ui/sheet";

import { cn } from "~/lib/utils";

const Sheet = BaseSheet;
const SheetTrigger = BaseSheetTrigger;
const SheetClose = BaseSheetClose;
const SheetHeader = BaseSheetHeader;
const SheetFooter = BaseSheetFooter;
const SheetTitle = BaseSheetTitle;
const SheetDescription = BaseSheetDescription;

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof BaseSheetContent> {}

const SheetContent = React.forwardRef<React.ElementRef<typeof BaseSheetContent>, SheetContentProps>(
  ({ className, children, ...props }, ref) => (
    <BaseSheetContent
      ref={ref}
      className={cn(
        "fixed z-50 flex h-full w-[320px] flex-col border-white/10 bg-black/80 text-foreground backdrop-blur-md data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:border-r",
        className,
      )}
      {...props}
    >
      {children}
    </BaseSheetContent>
  ),
);
SheetContent.displayName = "SheetContent";

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
