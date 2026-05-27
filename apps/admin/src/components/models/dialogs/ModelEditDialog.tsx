"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@ecoctrl/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecoctrl/ui/dialog";
import { Input } from "@ecoctrl/ui/input";
import {
  Autocomplete,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompleteTrigger,
} from "@ecoctrl/ui/autocomplete";

import AppButton from "@/components/AppButton";
import ModelFileZone from "@/components/ModelFileZone";
import { modelsApi } from "@/api/models";
import type { DataModel } from "@ecoctrl/shared";

// ========================================
// Schema
// ========================================

const modelEditSchema = z.object({
  name: z.string().min(1, "请输入模型名称"),
  version: z.string().optional(),
  code: z.string().min(1, "请输入编码"),
  description: z.string().optional(),
});

type ModelEditFormData = z.infer<typeof modelEditSchema>;

// ========================================
// Props
// ========================================

interface ModelEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: DataModel | null;
  existingCodes: string[];
  onSuccess: () => void;
}

const FORMAT_MAP: Record<string, string> = {
  glb: "GLB",
  gltf: "GLTF",
  zip: "GLTF (zip)",
  obj: "OBJ",
  fbx: "FBX",
};

// ========================================
// Component
// ========================================

export function ModelEditDialog({
  open,
  onOpenChange,
  model,
  existingCodes,
  onSuccess,
}: ModelEditDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDeleted, setFileDeleted] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ModelEditFormData>({
    resolver: zodResolver(modelEditSchema as any),
    defaultValues: {
      name: "",
      version: "",
      code: "",
      description: "",
    },
  });

  // Populate form when dialog opens
  useEffect(() => {
    if (open && model) {
      reset({
        name: model.name ?? "",
        version: model.version ?? "",
        code: model.code ?? "",
        description: model.description ?? "",
      });
      setSelectedFile(null);
      setFileDeleted(false);
      clearErrors();
    }
  }, [open, model, reset, clearErrors]);

  const handleFileSelect = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!FORMAT_MAP[ext]) {
      setError("root", {
        type: "manual",
        message: `不支持的格式: .${ext}，请上传 .glb、.gltf、.zip、.obj 或 .fbx 文件`,
      });
      return;
    }
    setSelectedFile(file);
    clearErrors("root");
  };

  const existingInfo =
    fileDeleted || !model?.fileUrl
      ? null
      : {
          name: model.name,
          size: model.size,
          format: model.format,
        };

  const onSubmit = async (data: ModelEditFormData) => {
    if (!model) return;

    const updatePayload: {
      name: string;
      version: string;
      code: string;
      description?: string | null;
      fileUrl?: string | null;
    } = {
      name: data.name.trim(),
      version: data.version?.trim() || "v1.0",
      code: data.code.toUpperCase(),
      description: data.description?.trim() || null,
    };

    if (fileDeleted) {
      updatePayload.fileUrl = null;
    }

    try {
      await modelsApi.update(model.id, updatePayload);

      if (selectedFile && !fileDeleted) {
        await modelsApi.replaceFile(model.id, selectedFile);
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError("root", {
        type: "api",
        message: err instanceof Error ? err.message : "保存失败，请重试",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Pencil size={18} />
            编辑模型
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
            {/* Replace file zone */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                替换模型文件（可选）
              </label>
              <ModelFileZone
                file={selectedFile}
                existingInfo={existingInfo}
                onFileSelect={handleFileSelect}
                onFileClear={() => setSelectedFile(null)}
                onDeleteExisting={() => setFileDeleted(true)}
              />
            </div>

            {/* Basic info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="edit-model-name"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    模型名称
                  </label>
                  <Input
                    id="edit-model-name"
                    placeholder="请输入模型名称"
                    className="h-10"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="edit-model-version"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    版本（可选）
                  </label>
                  <Input
                    id="edit-model-version"
                    placeholder="v1.0"
                    className="h-10"
                    {...register("version")}
                  />
                </div>
              </div>
              <div className="[&_[data-slot=input-group]]:h-10">
                <label
                  htmlFor="edit-model-code"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  编码
                </label>
                <Controller
                  name="code"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      value={field.value}
                      onValueChange={(v: string) => field.onChange(v.toUpperCase())}
                      items={existingCodes}
                      openOnInputClick
                      filter={() => true}
                    >
                      <AutocompleteInput
                        id="edit-model-code"
                        placeholder="1位字符，如 C"
                        maxLength={1}
                        aria-hidden={false}
                        className="h-10"
                      >
                        <AutocompleteTrigger />
                      </AutocompleteInput>
                      <AutocompletePopup className="z-[100]">
                        <AutocompleteList>
                          {(type: string) => (
                            <AutocompleteItem key={type} value={type}>
                              {type}
                            </AutocompleteItem>
                          )}
                        </AutocompleteList>
                      </AutocompletePopup>
                    </Autocomplete>
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1.5">1 位大写字母，如 C</p>
              </div>
              <div>
                <label
                  htmlFor="edit-model-description"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  描述（可选）
                </label>
                <Input
                  id="edit-model-description"
                  placeholder="请输入模型描述"
                  className="h-10"
                  {...register("description")}
                />
              </div>
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
              disabled={isSubmitting}
              className="h-10 px-5 gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  保存中...
                </>
              ) : (
                <>
                  <Pencil size={16} />
                  确认保存
                </>
              )}
            </AppButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
