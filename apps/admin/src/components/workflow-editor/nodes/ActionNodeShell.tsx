import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export const ActionNodeShell: React.FC<NodeProps> = ({ data }) => {
  const label = (data.label as string) || (data.name as string) || "";
  const icon = data.icon as string | undefined;
  const color = data.color as string | undefined;

  return (
    <div
      className="rounded-lg px-4 py-2 border-2 flex items-center gap-2 min-w-[120px]"
      style={{
        borderColor: color ?? "#3b82f6",
        backgroundColor: `${color ?? "#3b82f6"}15`,
      }}
    >
      <Handle type="target" position={Position.Top} />
      {icon && <div dangerouslySetInnerHTML={{ __html: icon }} className="w-4 h-4" />}
      <span className="text-sm font-medium">{label}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};
