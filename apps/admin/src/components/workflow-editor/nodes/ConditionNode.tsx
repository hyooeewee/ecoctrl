import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

export default function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`flex w-[280px] items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-md transition-all dark:bg-zinc-900 ${selected ? "ring-2 ring-amber-400" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-amber-500"
      />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
        <GitBranch size={16} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{(data.label as string) ?? "条件"}</span>
        <span className="text-muted-foreground truncate text-xs">分支判断</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-emerald-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-rose-500"
      />
    </div>
  );
}
