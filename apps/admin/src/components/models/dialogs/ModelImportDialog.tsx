"use client";

import { useCallback } from "react";
import { Upload } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@ecoctrl/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecoctrl/ui/dialog";

import AppButton from "@/components/AppButton";
import ModelFileZone from "@/components/ModelFileZone";
import { modelsApi } from "@/api/models";
import { toast } from "sonner";

// ========================================
// Props
// ========================================

interface ModelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ========================================
// Component
// ========================================

export function ModelImportDialog({ open, onOpenChange, onSuccess }: ModelImportDialogProps) {
  const {
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<{ file: File | null }>({
    defaultValues: { file: null },
  });

  const file = watch("file");

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (ext !== "json" && ext !== "csv" && ext !== "xlsx") {
        setError("root", {
          type: "manual",
          message: `不支持的格式: .${ext}，请上传 .json、.csv 或 .xlsx 文件`,
        });
        return;
      }
      setValue("file", selectedFile);
      clearErrors("root");
    },
    [setValue, setError, clearErrors],
  );

  const handleClearFile = useCallback(() => {
    setValue("file", null);
    clearErrors("root");
  }, [setValue, clearErrors]);

  const onSubmit = async (data: { file: File | null }) => {
    if (!data.file) return;
    try {
      const result = await modelsApi.importPoints(data.file);
      onOpenChange(false);
      reset({ file: null });
      onSuccess();
      toast.success(
        `导入成功：创建 ${result.createdModels} 个模型，` +
          `创建 ${result.createdObjects} 个对象，` +
          `创建 ${result.createdPoints} 个点位，` +
          `跳过 ${result.skippedPoints} 个已存在点位。`,
      );
    } catch (err) {
      setError("root", {
        type: "api",
        message: err instanceof Error ? err.message : "导入失败，请重试",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          reset({ file: null });
          clearErrors();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Upload size={18} />
            导入点位
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">导入文件</label>
              <ModelFileZone
                file={file}
                onFileSelect={handleFileSelect}
                onFileClear={handleClearFile}
                acceptedFormats=".json,.csv,.xlsx"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                支持 .json、.csv 或 .xlsx 格式。.xlsx 将按"设备名称"列自动分组创建模型和对象。
              </p>
            </div>

            {errors.root && (
              <div className="rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4 flex justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-5"
            >
              取消
            </Button>
            <AppButton
              level="action"
              type="submit"
              disabled={!file || isSubmitting}
              className="h-10 px-5 gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  导入中...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  确认导入
                </>
              )}
            </AppButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
