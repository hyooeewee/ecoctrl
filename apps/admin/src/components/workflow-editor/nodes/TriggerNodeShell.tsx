import React from "react";
import { Handle, Position } from "@xyflow/react";

interface TriggerNodeShellProps {
  id: string;
  data: {
    name: string;
    icon?: string;
    color?: string;
  };
}

export const TriggerNodeShell: React.FC<TriggerNodeShellProps> = ({ data }) => {
  return (
    <div
      className="rounded-full px-4 py-2 border-2 flex items-center gap-2 min-w-[120px]"
      style={{
        borderColor: data.color ?? "#f59e0b",
        backgroundColor: `${data.color ?? "#f59e0b"}15`,
      }}
    >
      {data.icon && (
        <div dangerouslySetInnerHTML={{ __html: data.icon }} className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">{data.name}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};
