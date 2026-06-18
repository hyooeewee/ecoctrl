import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Server,
  Box,
  Workflow,
  FileBox,
  Wrench,
  AlertTriangle,
  Zap,
  Shield,
  Settings,
} from "lucide-react";

export interface NavTab {
  id: string;
  label: string;
}

export interface NavNode {
  id: string;
  label: string;
  icon: LucideIcon;
  parentId?: string;
  tabs?: NavTab[];
  tabStoreKey?: string;
}

export const navNodes: NavNode[] = [
  { id: "overview", label: "管理总览", icon: LayoutDashboard },
  { id: "accounts", label: "账户控制", icon: Users },
  {
    id: "models",
    label: "数据模型",
    icon: Server,
    tabs: [
      { id: "models", label: "数据模型" },
      { id: "objects", label: "业务对象" },
      { id: "points", label: "点位信息" },
    ],
    tabStoreKey: "modelsTab",
  },
  {
    id: "settingsGroup",
    label: "大屏模型",
    icon: Box,
    tabs: [
      { id: "hotspots", label: "热点区域配置" },
      { id: "labels", label: "标签配置" },
    ],
    tabStoreKey: "dashboardModelTab",
  },
  {
    id: "workflows",
    label: "逻辑控制",
    icon: Workflow,
    tabs: [
      { id: "workflows", label: "工作流" },
      { id: "executions", label: "执行记录" },
    ],
    tabStoreKey: "workflowsTab",
  },
  { id: "reports", label: "报表管理", icon: FileBox },
  { id: "maintenance", label: "维保管理", icon: Wrench },
  {
    id: "faults",
    label: "故障管理",
    icon: AlertTriangle,
    tabs: [
      { id: "list", label: "实时故障列表" },
      { id: "analytics", label: "故障统计分析" },
    ],
    tabStoreKey: "faultsTab",
  },
  {
    id: "energy",
    label: "能耗管理",
    icon: Zap,
    tabs: [
      { id: "overview", label: "分区总览" },
      { id: "details", label: "详细数据" },
      { id: "stats", label: "统计报表" },
      { id: "config", label: "碳排放因子" },
    ],
    tabStoreKey: "energyTab",
  },
  { id: "advancedManagement", label: "高级管理", icon: Shield },
  { id: "config", label: "系统配置", icon: Settings },
  { id: "profile", label: "个人信息", icon: Settings, parentId: "config" },
  { id: "preferences", label: "偏好设置", icon: Settings, parentId: "config" },
];

/** Top-level items for the Sidebar. */
export const sidebarNavItems = navNodes.filter((n) => !n.parentId);

/** Find a node by its ID. */
export function findNode(id: string): NavNode | undefined {
  return navNodes.find((n) => n.id === id);
}

/** Get breadcrumb segments for the current page (excluding the virtual root). */
export function getBreadcrumbPath(
  activeTab: string,
  _subTabId?: string,
): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  const node = findNode(activeTab);
  if (!node) return result;

  if (node.parentId) {
    const parent = findNode(node.parentId);
    if (parent) result.push({ id: parent.id, label: parent.label });
  }
  result.push({ id: node.id, label: node.label });

  return result;
}

/** Get sibling nodes at the same level as the given node. */
export function getSiblings(nodeId: string): NavNode[] {
  const node = findNode(nodeId);
  if (!node) return [];
  if (node.parentId) {
    return navNodes.filter((n) => n.parentId === node.parentId);
  }
  return navNodes.filter((n) => !n.parentId);
}

/** Get top-level sibling nodes (for the root dropdown). */
export function getTopLevelNodes(): NavNode[] {
  return navNodes.filter((n) => !n.parentId);
}
