// ========================================
// Label Export Dialog
// ========================================

import React, { useState, useMemo } from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ecoctrl/ui";
import AppButton from "@/components/AppButton";
import type { DashboardModelLabel } from "@ecoctrl/shared";
import { buildExportPayload, downloadJson } from "./label-io";

interface LabelExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: DashboardModelLabel[];
}

interface FlatLabel {
  id: string;
  name: string;
  depth: number;
  actionCount: number;
  selected: boolean;
}

function buildFlatList(labels: DashboardModelLabel[]): FlatLabel[] {
  const byParent = new Map<string | null, DashboardModelLabel[]>();
  for (const l of labels) {
    const pid = l.tree?.parentId ?? null;
    const arr = byParent.get(pid) ?? [];
    arr.push(l);
    byParent.set(pid, arr);
  }

  const result: FlatLabel[] = [];
  function walk(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? [];
    children.sort((a, b) => (a.tree?.order ?? 0) - (b.tree?.order ?? 0));
    for (const c of children) {
      result.push({
        id: c.meta.id,
        name: c.meta.name,
        depth,
        actionCount: c.actions?.length ?? 0,
        selected: true,
      });
      walk(c.meta.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

export default function LabelExportDialog({ open, onOpenChange, labels }: LabelExportDialogProps) {
  const [flatLabels, setFlatLabels] = useState<FlatLabel[]>(() => buildFlatList(labels));
  const [exporting, setExporting] = useState(false);

  const selectedCount = useMemo(() => flatLabels.filter((l) => l.selected).length, [flatLabels]);

  const toggleAll = (checked: boolean) => {
    setFlatLabels((prev) => prev.map((l) => ({ ...l, selected: checked })));
  };

  const toggleOne = (id: string) => {
    setFlatLabels((prev) => prev.map((l) => (l.id === id ? { ...l, selected: !l.selected } : l)));
  };

  const handleExport = () => {
    setExporting(true);
    try {
      const selectedIds = new Set(flatLabels.filter((l) => l.selected).map((l) => l.id));
      const selectedLabels = labels.filter((l) => selectedIds.has(l.meta.id));
      const payload = buildExportPayload(selectedLabels);
      const ts = new Date().toISOString().slice(0, 10);
      downloadJson(payload, `labels-export-${ts}.json`);
      onOpenChange(false);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>导出标签</DialogTitle>
          <DialogDescription>选择要导出的标签（共 {labels.length} 个）</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b pb-2 text-sm">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCount === flatLabels.length}
              onChange={(e) => toggleAll(e.target.checked)}
              className="accent-primary"
            />
            全选 / 全不选
          </label>
          <span className="ml-auto text-muted-foreground">
            已选 {selectedCount} / {flatLabels.length}
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-0.5">
          {flatLabels.map((l) => (
            <label
              key={l.id}
              className="flex items-center gap-2 py-1 px-2 rounded hover:bg-accent cursor-pointer text-sm"
              style={{ paddingLeft: `${l.depth * 20 + 8}px` }}
            >
              <input
                type="checkbox"
                checked={l.selected}
                onChange={() => toggleOne(l.id)}
                className="accent-primary"
              />
              <span className="flex-1 truncate">{l.name}</span>
              {l.actionCount > 0 && (
                <span className="text-xs text-muted-foreground">{l.actionCount} 动作</span>
              )}
            </label>
          ))}
        </div>

        <DialogFooter>
          <AppButton variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </AppButton>
          <AppButton onClick={handleExport} disabled={selectedCount === 0 || exporting}>
            <Download className="w-4 h-4 mr-1.5" />
            导出 {selectedCount} 个标签
          </AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
