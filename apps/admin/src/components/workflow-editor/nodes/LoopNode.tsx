import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Repeat } from "lucide-react";

export default function LoopNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`flex w-[280px] items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-md transition-all dark:bg-zinc-900 ${selected ? "ring-2 ring-cyan-400" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-cyan-500"
      />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400">
        <Repeat size={16} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{(data.label as string) ?? "循环"}</span>
        <span className="text-muted-foreground truncate text-xs">循环执行子流程</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400"
      />
    </div>
  );
}
