// ========================================
// Label Import Dialog
// ========================================

import React, { useState, useRef, useMemo } from "react";
import { Upload, AlertTriangle } from "lucide-react";
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
import {
  parseImportFile,
  detectConflicts,
  applyResolutions,
  type ImportLabel,
  type ConflictResolution,
} from "./label-io";

interface LabelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLabels: DashboardModelLabel[];
  onImport: (labels: DashboardModelLabel[]) => void;
}

type Step = "pick" | "review";

export default function LabelImportDialog({
  open,
  onOpenChange,
  existingLabels,
  onImport,
}: LabelImportDialogProps) {
  const [step, setStep] = useState<Step>("pick");
  const [importLabels, setImportLabels] = useState<ImportLabel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const conflictCount = useMemo(
    () => importLabels.filter((l) => l.conflictStatus === "conflict").length,
    [importLabels],
  );

  const importableCount = useMemo(
    () => importLabels.filter((l) => l.resolution !== "skip").length,
    [importLabels],
  );

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      const text = await file.text();
      const parsed = parseImportFile(text);
      const withConflicts = detectConflicts(parsed, existingLabels);
      setImportLabels(withConflicts);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  };

  const setResolution = (id: string, resolution: ConflictResolution) => {
    setImportLabels((prev) => prev.map((l) => (l.meta.id === id ? { ...l, resolution } : l)));
  };

  const toggleSkip = (id: string) => {
    setImportLabels((prev) =>
      prev.map((l) =>
        l.meta.id === id ? { ...l, resolution: l.resolution === "skip" ? "rename" : "skip" } : l,
      ),
    );
  };

  const handleImport = () => {
    const resolved = applyResolutions(importLabels);
    onImport(resolved);
    onOpenChange(false);
    reset();
  };

  const reset = () => {
    setStep("pick");
    setImportLabels([]);
    setError(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>导入标签</DialogTitle>
          <DialogDescription>
            {step === "pick"
              ? "选择包含标签配置的 JSON 文件"
              : `预览导入内容（${importLabels.length} 个标签，${conflictCount} 个冲突）`}
          </DialogDescription>
        </DialogHeader>

        {step === "pick" && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFilePick}
            />
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">点击选择 JSON 文件</p>
            </div>
            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <pre className="whitespace-pre-wrap">{error}</pre>
              </div>
            )}
          </>
        )}

        {step === "review" && (
          <div className="max-h-96 overflow-y-auto">
            {conflictCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950 rounded-md p-2 mb-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{conflictCount} 个标签 ID 与现有标签冲突，请选择处理方式</span>
              </div>
            )}

            <div className="space-y-1">
              {importLabels.map((label) => (
                <div
                  key={label.meta.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded text-sm border"
                  style={{ opacity: label.resolution === "skip" ? 0.5 : 1 }}
                >
                  <input
                    type="checkbox"
                    checked={label.resolution !== "skip"}
                    onChange={() => toggleSkip(label.meta.id)}
                    className="accent-primary"
                  />
                  <span className="flex-1 truncate font-medium">{label.meta.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{label.meta.id}</span>

                  {label.conflictStatus === "conflict" && label.resolution !== "skip" && (
                    <select
                      value={label.resolution}
                      onChange={(e) =>
                        setResolution(label.meta.id, e.target.value as ConflictResolution)
                      }
                      className="text-xs border rounded px-1 py-0.5 bg-background"
                    >
                      <option value="rename">重命名</option>
                      <option value="overwrite">覆盖</option>
                    </select>
                  )}

                  {label.conflictStatus === "conflict" && (
                    <span className="text-xs text-amber-600 shrink-0">冲突</span>
                  )}
                  {label.conflictStatus === "new" && (
                    <span className="text-xs text-green-600 shrink-0">新增</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "review" && (
            <AppButton variant="outline" onClick={() => setStep("pick")}>
              返回
            </AppButton>
          )}
          <AppButton variant="outline" onClick={() => handleClose(false)}>
            取消
          </AppButton>
          {step === "review" && (
            <AppButton onClick={handleImport} disabled={importableCount === 0}>
              <Upload className="w-4 h-4 mr-1.5" />
              导入 {importableCount} 个标签
            </AppButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
