import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Globe,
  Database,
  Mail,
  Variable,
  Clock,
  Activity,
  Pencil,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  http_request: Globe,
  database: Database,
  email: Mail,
  variable: Variable,
  delay: Clock,
  point_read: Activity,
  point_write: Pencil,
};

const COLOR_MAP: Record<string, string> = {
  http_request: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  database: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  email: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
  variable: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
  delay: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  point_read: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
  point_write: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
};

const DESC_MAP: Record<string, string> = {
  http_request: "发送 HTTP 请求",
  database: "数据库操作",
  email: "发送邮件",
  variable: "设置变量",
  delay: "等待一段时间",
  point_read: "读取点位数据",
  point_write: "写入点位数据",
};

export default function ActionNode({ data, selected }: NodeProps) {
  const Icon = ICON_MAP[data.type as string] ?? Variable;
  const colorClass = COLOR_MAP[data.type as string] ?? COLOR_MAP.variable;
  const config = data.config as Record<string, unknown> | undefined;
  const desc =
    (config?.description as string) || DESC_MAP[data.type as string] || (data.type as string);

  return (
    <div
      className={`flex w-[280px] items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-md transition-all dark:bg-zinc-900 ${selected ? "ring-2 ring-primary" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400"
      />
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
        <Icon size={16} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{(data.label as string) ?? "动作"}</span>
        <span className="text-muted-foreground truncate text-xs">{desc}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400"
      />
    </div>
  );
}
