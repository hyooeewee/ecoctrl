import React from "react";
import { Handle, Position } from "@xyflow/react";

interface ConditionNodeShellProps {
  id: string;
  data: {
    name: string;
    icon?: string;
    color?: string;
  };
}

export const ConditionNodeShell: React.FC<ConditionNodeShellProps> = ({ data }) => {
  return (
    <div
      className="px-4 py-2 border-2 flex items-center gap-2 min-w-[120px] rotate-45"
      style={{
        borderColor: data.color ?? "#8b5cf6",
        backgroundColor: `${data.color ?? "#8b5cf6"}15`,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="-rotate-45 flex items-center gap-2">
        {data.icon && (
          <div dangerouslySetInnerHTML={{ __html: data.icon }} className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">{data.name}</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" />
      <Handle type="source" position={Position.Right} id="false" />
    </div>
  );
};
