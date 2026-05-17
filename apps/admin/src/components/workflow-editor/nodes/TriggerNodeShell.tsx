import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export const TriggerNodeShell: React.FC<NodeProps> = ({ data }) => {
  const label = (data.label as string) || (data.name as string) || "";
  const icon = data.icon as string | undefined;
  const color = data.color as string | undefined;

  return (
    <div
      className="rounded-full px-4 py-2 border-2 flex items-center gap-2 min-w-[120px]"
      style={{
        borderColor: color ?? "#f59e0b",
        backgroundColor: `${color ?? "#f59e0b"}15`,
      }}
    >
      {icon && <div dangerouslySetInnerHTML={{ __html: icon }} className="w-4 h-4" />}
      <span className="text-sm font-medium">{label}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};
