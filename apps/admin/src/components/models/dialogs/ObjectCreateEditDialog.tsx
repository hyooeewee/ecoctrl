"use client";

import { useEffect, useMemo } from "react";
import { Plus, Pencil } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@ecoctrl/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecoctrl/ui/dialog";
import { Input } from "@ecoctrl/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui/select";

import AppButton from "@/components/AppButton";
import { objectsApi } from "@/api/objects";
import type { DataModel, BusinessObject } from "@ecoctrl/shared";

// ========================================
// Schema
// ========================================

const objectSchema = z.object({
  modelId: z.string().min(1, "请选择模型"),
  code: z.string().min(1, "请输入编码"),
  name: z.string().min(1, "请输入对象名称"),
  description: z.string().optional(),
});

type ObjectFormData = z.infer<typeof objectSchema>;

// ========================================
// Props
// ========================================

interface ObjectCreateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: DataModel[];
  editingObject: BusinessObject | null;
  onSuccess: () => void;
}

// ========================================
// Component
// ========================================

export function ObjectCreateEditDialog({
  open,
  onOpenChange,
  models,
  editingObject,
  onSuccess,
}: ObjectCreateEditDialogProps) {
  const isEditing = !!editingObject;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ObjectFormData>({
    resolver: zodResolver(objectSchema as any),
    defaultValues: {
      modelId: "",
      code: "",
      name: "",
      description: "",
    },
  });

  // Populate form when dialog opens
  useEffect(() => {
    if (open) {
      if (editingObject) {
        reset({
          modelId: editingObject.modelId ?? "",
          code: editingObject.code ?? "",
          name: editingObject.name ?? "",
          description: editingObject.description ?? "",
        });
      } else {
        reset({
          modelId: "",
          code: "",
          name: "",
          description: "",
        });
      }
      clearErrors();
    }
  }, [open, editingObject, reset, clearErrors]);

  const codeError = useMemo(() => {
    const code = errors.code;
    if (code) return code.message;
    return undefined;
  }, [errors.code]);

  const onSubmit = async (data: ObjectFormData) => {
    // Additional validation: code must be 4 digits
    if (!/^\d{4}$/.test(data.code.trim())) {
      setError("code", { type: "manual", message: "编码必须为4位数字" });
      return;
    }

    const payload = {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      description: data.description?.trim() || "",
      modelId: data.modelId,
    };

    try {
      if (isEditing && editingObject) {
        await objectsApi.update(editingObject.id, payload);
      } else {
        await objectsApi.create(payload);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError("root", {
        type: "api",
        message:
          err instanceof Error ? err.message : isEditing ? "保存失败，请重试" : "创建失败，请重试",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isEditing ? <Pencil size={18} /> : <Plus size={18} />}
            {isEditing ? "编辑业务对象" : "新增业务对象"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
            <div className="space-y-4">
              {/* Model Select */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">选择模型</label>
                <Controller
                  name="modelId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-10 py-0">
                        <SelectValue placeholder="请选择模型">
                          {field.value
                            ? (models.find((m) => m.id === field.value)?.name ?? "请选择模型")
                            : "请选择模型"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <span className="block truncate">{m.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.modelId && (
                  <p className="text-sm text-destructive mt-1">{errors.modelId.message}</p>
                )}
              </div>

              {/* Code + Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="object-code"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    编码
                  </label>
                  <Input
                    id="object-code"
                    placeholder="4位数字"
                    maxLength={4}
                    className="h-10 text-center font-mono"
                    {...register("code")}
                  />
                  {(errors.code || codeError) && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.code?.message || codeError}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="object-name"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    对象名称
                  </label>
                  <Input
                    id="object-name"
                    placeholder="请输入对象名称"
                    className="h-10"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                  )}
                </div>
              </div>

              {/* Description Input */}
              <div>
                <label
                  htmlFor="object-description"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  描述
                </label>
                <Input
                  id="object-description"
                  placeholder="请输入描述（可选）"
                  className="h-10"
                  {...register("description")}
                />
              </div>
            </div>

            {/* Form-level error */}
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
                  {isEditing ? "保存中..." : "创建中..."}
                </>
              ) : (
                <>
                  {isEditing ? <Pencil size={16} /> : <Plus size={16} />}
                  {isEditing ? "保存修改" : "确认创建"}
                </>
              )}
            </AppButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
