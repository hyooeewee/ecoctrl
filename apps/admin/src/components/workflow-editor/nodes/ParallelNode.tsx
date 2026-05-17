import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Layers } from "lucide-react";

export default function ParallelNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`flex w-[280px] items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-md transition-all dark:bg-zinc-900 ${selected ? "ring-2 ring-teal-400" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-teal-500"
      />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
        <Layers size={16} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{(data.label as string) ?? "并行"}</span>
        <span className="text-muted-foreground truncate text-xs">并行执行多个分支</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400"
      />
    </div>
  );
}
