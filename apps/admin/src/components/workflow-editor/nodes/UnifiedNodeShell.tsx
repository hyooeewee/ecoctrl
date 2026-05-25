import { useContext } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { LayoutTemplate } from "lucide-react";

import ClickableHandle from "./ClickableHandle";
import { PluginNodesContext } from "../nodes-context";

/** Handle layout configuration per node type. */
interface HandleConfig {
  targets?: Array<{ position: typeof Position.Left; id?: string; hidden?: boolean }>;
  sources?: Array<{ position: typeof Position.Right; id?: string; color?: string }>;
}

const HANDLE_CONFIG: Record<string, HandleConfig> = {
  start: {
    targets: [{ position: Position.Left, hidden: true }],
    sources: [{ position: Position.Right }],
  },
  end: {
    targets: [{ position: Position.Left }],
  },
  condition: {
    targets: [{ position: Position.Left }],
    sources: [
      { position: Position.Right, id: "true", color: "#10b981" },
      { position: Position.Right, id: "false", color: "#f43f5e" },
    ],
  },
  switch: {
    targets: [{ position: Position.Left }],
    sources: [
      { position: Position.Right, id: "true", color: "#10b981" },
      { position: Position.Right, id: "false", color: "#f43f5e" },
    ],
  },
};

const DEFAULT_HANDLES: HandleConfig = {
  targets: [{ position: Position.Left }],
  sources: [{ position: Position.Right }],
};

/** Build RGBA color from hex with given alpha (0-255). */
function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  return `#${clean}${alpha.toString(16).padStart(2, "0")}`;
}

export default function UnifiedNodeShell({ data, selected, id }: NodeProps) {
  const type = (data.type as string) || "";
  const label = (data.label as string) || "";
  const pluginNodes = useContext(PluginNodesContext);
  const plugin = pluginNodes.find((p) => p.id === type);

  const color = plugin?.color ?? "#94a3b8";
  const handles = HANDLE_CONFIG[type] ?? DEFAULT_HANDLES;

  const ringClass = selected ? "ring-2" : "";
  const ringStyle = selected ? { ringColor: color } : undefined;

  return (
    <div
      className={`flex w-[280px] items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-md transition-all dark:bg-zinc-900 ${ringClass}`}
      style={ringStyle}
    >
      {/* Target handles */}
      {handles.targets?.map((t, i) =>
        t.hidden ? (
          <Handle
            key={`t-${i}`}
            type="target"
            position={t.position}
            id={t.id}
            className="!opacity-0"
          />
        ) : (
          <ClickableHandle
            key={`t-${i}`}
            type="target"
            position={t.position}
            id={t.id}
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
            className="!h-2.5 !w-2.5 !border-2 !border-white"
            style={{ backgroundColor: color }}
          />
        ),
      )}

      {/* Icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: hexWithAlpha(color, 0x20), color }}
      >
        {plugin?.icon ? (
          <div dangerouslySetInnerHTML={{ __html: plugin.icon }} className="h-4 w-4" />
        ) : (
          <LayoutTemplate size={16} />
        )}
      </div>

      {/* Label + description */}
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{label}</span>
        <span className="text-muted-foreground truncate text-xs">{plugin?.description || ""}</span>
      </div>

      {/* Source handles */}
      {handles.sources?.map((s, i) => (
        <ClickableHandle
          key={`s-${i}`}
          type="source"
          position={s.position}
          id={s.id}
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
          className="!h-2.5 !w-2.5 !border-2 !border-white"
          style={{ backgroundColor: s.color ?? color }}
        />
      ))}
    </div>
  );
}
