import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Square } from "lucide-react";

export default function EndNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`flex w-[280px] items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-md transition-all dark:bg-zinc-900 ${selected ? "ring-2 ring-rose-400" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-rose-500"
      />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
        <Square size={16} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{(data.label as string) ?? "结束"}</span>
        <span className="text-muted-foreground truncate text-xs">流程结束</span>
      </div>
    </div>
  );
}
