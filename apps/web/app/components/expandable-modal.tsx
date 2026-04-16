import * as React from "react";

import { Dialog, DialogContent } from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

interface ExpandableModalProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}

export function ExpandableModal({
  trigger,
  children,
  contentClassName,
}: ExpandableModalProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="cursor-pointer transition-transform duration-150 ease-out active:scale-[0.98]"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {trigger}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className={cn(
            "dark h-[80vh] w-[80vw] !max-w-none border-white/10 bg-[rgba(4,14,30,0.92)] p-0 text-white backdrop-blur-xl overflow-hidden",
            contentClassName,
          )}
        >
          {children}
        </DialogContent>
      </Dialog>
    </>
  );
}
