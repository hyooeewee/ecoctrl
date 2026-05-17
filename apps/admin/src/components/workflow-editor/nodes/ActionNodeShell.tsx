import React from "react";
import { Handle, Position } from "@xyflow/react";

interface ActionNodeShellProps {
  id: string;
  data: {
    name: string;
    icon?: string;
    color?: string;
  };
}

export const ActionNodeShell: React.FC<ActionNodeShellProps> = ({ data }) => {
  return (
    <div
      className="rounded-lg px-4 py-2 border-2 flex items-center gap-2 min-w-[120px]"
      style={{
        borderColor: data.color ?? "#3b82f6",
        backgroundColor: `${data.color ?? "#3b82f6"}15`,
      }}
    >
      <Handle type="target" position={Position.Top} />
      {data.icon && (
        <div dangerouslySetInnerHTML={{ __html: data.icon }} className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">{data.name}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};
