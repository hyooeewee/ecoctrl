// ========================================
// Label Tree Component
// ========================================

import React, { useState } from "react";
import { ChevronRight, ChevronDown, Plus, Trash2, Pencil, GripVertical } from "lucide-react";
import { Badge } from "@ecoctrl/ui";
import AppButton from "@/components/AppButton";

// ========================================
// Types
// ========================================

export interface LabelTreeNode {
  id: string;
  key: string;
  name: string;
  parentId?: string;
  children: LabelTreeNode[];
  operationCount: number;
}

interface LabelTreeProps {
  labels: LabelTreeNode[];
  selectedId: string | null;
  onSelect?: (id: string) => void;
  onAdd?: (parentId?: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

// ========================================
// Component
// ========================================

export default function LabelTree({
  labels,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onEdit,
}: LabelTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddRoot = () => {
    onAdd?.();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">标签树</h3>
        <AppButton level="action" size="sm" onClick={handleAddRoot}>
          <Plus size={14} className="mr-1" />
          添加标签
        </AppButton>
      </div>

      {/* Tree */}
      <div className="rounded-md border bg-muted/30 p-2">
        {labels.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            暂无标签，点击上方按钮添加
          </div>
        ) : (
          labels.map((label) => (
            <LabelTreeItem
              key={label.id}
              label={label}
              level={0}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onSelect={onSelect}
              onAdd={onAdd}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ========================================
// Tree Item (Recursive)
// ========================================

interface LabelTreeItemProps {
  label: LabelTreeNode;
  level: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect?: (id: string) => void;
  onAdd?: (parentId?: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

function LabelTreeItem({
  label,
  level,
  selectedId,
  expandedIds,
  onToggleExpand,
  onSelect,
  onAdd,
  onDelete,
  onEdit,
}: LabelTreeItemProps) {
  const isExpanded = expandedIds.has(label.id);
  const isSelected = selectedId === label.id;
  const hasChildren = label.children.length > 0;

  return (
    <div>
      {/* Row */}
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors ${
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Expand/collapse or spacer */}
        {hasChildren ? (
          <button
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded hover:bg-muted-foreground/20"
            onClick={() => onToggleExpand(label.id)}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Label icon */}
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
          ●
        </span>

        {/* Name */}
        <span className="flex-1 truncate cursor-pointer" onClick={() => onSelect?.(label.id)}>
          {label.name || label.key}
        </span>

        {/* Operation count badge */}
        {label.operationCount > 0 && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {label.operationCount}
          </Badge>
        )}

        {/* Actions (visible on hover) */}
        <div className="hidden shrink-0 group-hover:flex items-center gap-0.5">
          <AppButton
            level="ghost"
            size="icon-xs"
            onClick={() => onAdd?.(label.id)}
            title="添加子标签"
          >
            <Plus size={12} />
          </AppButton>
          <AppButton level="ghost" size="icon-xs" onClick={() => onEdit?.(label.id)} title="编辑">
            <Pencil size={12} />
          </AppButton>
          <AppButton
            level="danger"
            size="icon-xs"
            onClick={() => onDelete?.(label.id)}
            title="删除"
          >
            <Trash2 size={12} />
          </AppButton>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {label.children.map((child) => (
            <LabelTreeItem
              key={child.id}
              label={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onAdd={onAdd}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
