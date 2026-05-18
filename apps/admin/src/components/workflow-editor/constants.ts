import type { LucideIcon } from "lucide-react";
import {
  Play,
  Square,
  Globe,
  Database,
  Mail,
  Variable,
  Clock,
  GitBranch,
  GitFork,
  Repeat,
  Layers,
  Zap,
  Activity,
  Pencil,
} from "lucide-react";
import React from "react";

import StartNode from "./nodes/StartNode";
import EndNode from "./nodes/EndNode";
import ActionNode from "./nodes/ActionNode";
import ConditionNode from "./nodes/ConditionNode";
import LoopNode from "./nodes/LoopNode";
import ParallelNode from "./nodes/ParallelNode";
import { TriggerNodeShell } from "./nodes/TriggerNodeShell";
import { ActionNodeShell } from "./nodes/ActionNodeShell";
import { ConditionNodeShell } from "./nodes/ConditionNodeShell";
import type { NodeType } from "./types";

export const BUILT_IN_NODE_TYPES: Record<string, React.ComponentType<any>> = {
  start: StartNode,
  end: EndNode,
  http_request: ActionNode,
  database: ActionNode,
  email: ActionNode,
  variable: ActionNode,
  delay: ActionNode,
  point_read: ActionNode,
  point_write: ActionNode,
  condition: ConditionNode,
  switch: ConditionNode,
  loop: LoopNode,
  parallel: ParallelNode,
};

export const PLUGIN_NODE_SHELLS = {
  trigger: TriggerNodeShell,
  action: ActionNodeShell,
  condition: ConditionNodeShell,
} as const;

export interface ComponentItem {
  type: NodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
  /** Handle colors for drag preview: left = target, right = source */
  handles?: { left?: string; right?: string; condition?: boolean };
}

export interface ComponentCategory {
  id: string;
  label: string;
  items: ComponentItem[];
}

export const COMPONENT_CATEGORIES: ComponentCategory[] = [
  {
    id: "trigger",
    label: "触发器",
    items: [
      {
        type: "start",
        label: "开始",
        description: "流程入口节点",
        icon: Play,
        colorClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
        handles: { right: "#10b981" },
      },
    ],
  },
  {
    id: "actions",
    label: "动作",
    items: [
      {
        type: "http_request",
        label: "HTTP 请求",
        description: "发送 HTTP 请求",
        icon: Globe,
        colorClass: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
        handles: { left: "#94a3b8", right: "#94a3b8" },
      },
      {
        type: "database",
        label: "数据库",
        description: "数据库读写操作",
        icon: Database,
        colorClass: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
        handles: { left: "#94a3b8", right: "#94a3b8" },
      },
      {
        type: "email",
        label: "邮件",
        description: "发送邮件通知",
        icon: Mail,
        colorClass: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
        handles: { left: "#94a3b8", right: "#94a3b8" },
      },
      {
        type: "variable",
        label: "变量",
        description: "设置流程变量",
        icon: Variable,
        colorClass: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
        handles: { left: "#94a3b8", right: "#94a3b8" },
      },
      {
        type: "delay",
        label: "延迟",
        description: "等待指定时间",
        icon: Clock,
        colorClass: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
        handles: { left: "#94a3b8", right: "#94a3b8" },
      },
    ],
  },
  {
    id: "point",
    label: "点位操作",
    items: [
      {
        type: "point_read",
        label: "点位读取",
        description: "通过 IoT 网关读取点位值",
        icon: Activity,
        colorClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
        handles: { left: "#94a3b8", right: "#94a3b8" },
      },
      {
        type: "point_write",
        label: "点位写入",
        description: "通过 IoT 网关写入点位值",
        icon: Pencil,
        colorClass: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
        handles: { left: "#94a3b8", right: "#94a3b8" },
      },
    ],
  },
  {
    id: "logic",
    label: "逻辑",
    items: [
      {
        type: "condition",
        label: "条件",
        description: "分支条件判断",
        icon: GitBranch,
        colorClass: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
        handles: { left: "#f59e0b", condition: true },
      },
      {
        type: "switch",
        label: "多分支",
        description: "多路分支选择",
        icon: GitFork,
        colorClass: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
        handles: { left: "#f59e0b", condition: true },
      },
      {
        type: "loop",
        label: "循环",
        description: "循环执行子流程",
        icon: Repeat,
        colorClass: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400",
        handles: { left: "#06b6d4", right: "#94a3b8" },
      },
      {
        type: "parallel",
        label: "并行",
        description: "并行执行多个分支",
        icon: Layers,
        colorClass: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
        handles: { left: "#14b8a6", right: "#94a3b8" },
      },
    ],
  },
  {
    id: "others",
    label: "其他",
    items: [
      {
        type: "end",
        label: "结束",
        description: "流程结束节点",
        icon: Square,
        colorClass: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
        handles: { left: "#f43f5e" },
      },
    ],
  },
];

export const ALL_COMPONENTS = COMPONENT_CATEGORIES.flatMap((c) => c.items);

export const PREDEFINED_TAGS = ["能耗", "报警", "定时", "数据同步", "通知", "设备联动", "数据清洗"];
