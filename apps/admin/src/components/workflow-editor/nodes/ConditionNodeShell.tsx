import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export const ConditionNodeShell: React.FC<NodeProps> = ({ data }) => {
  const label = (data.label as string) || (data.name as string) || "";
  const icon = data.icon as string | undefined;
  const color = data.color as string | undefined;

  return (
    <div
      className="px-4 py-2 border-2 flex items-center gap-2 min-w-[120px] rotate-45"
      style={{
        borderColor: color ?? "#8b5cf6",
        backgroundColor: `${color ?? "#8b5cf6"}15`,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="-rotate-45 flex items-center gap-2">
        {icon && <div dangerouslySetInnerHTML={{ __html: icon }} className="w-4 h-4" />}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" />
      <Handle type="source" position={Position.Right} id="false" />
    </div>
  );
};
