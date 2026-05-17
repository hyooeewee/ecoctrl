import React from "react";

interface DragNodePreviewProps {
  type: string;
  data: { label: string; type: string; config: Record<string, unknown> };
}

export const DragNodePreview: React.FC<DragNodePreviewProps> = ({ data }) => {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
      <span className="text-xs font-medium">{data.label}</span>
    </div>
  );
};
