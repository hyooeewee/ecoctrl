import { Handle, Position, type NodeProps } from "@xyflow/react";
import ClickableHandle from "./ClickableHandle";
import { Play } from "lucide-react";

export default function StartNode({ data, selected, id }: NodeProps) {
  return (
    <div
      className={`flex w-[280px] items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-md transition-all dark:bg-zinc-900 ${selected ? "ring-2 ring-emerald-400" : ""}`}
    >
      <ClickableHandle
        type="target"
        position={Position.Left}
        nodeId={id}
        onAddNode={
          data.onAddNodeFromHandle as (
            nodeId: string,
            handleId?: string,
            handleType?: "target" | "source",
            edgeX?: number,
            edgeY?: number,
          ) => void
        }
        className="!opacity-0"
      />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
        <Play size={16} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{(data.label as string) ?? "开始"}</span>
        <span className="text-muted-foreground truncate text-xs">流程入口</span>
      </div>
      <ClickableHandle
        type="source"
        position={Position.Right}
        nodeId={id}
        onAddNode={
          data.onAddNodeFromHandle as (
            nodeId: string,
            handleId?: string,
            handleType?: "target" | "source",
            edgeX?: number,
            edgeY?: number,
          ) => void
        }
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-emerald-500"
      />
    </div>
  );
}
