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
import {
  Autocomplete,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompleteTrigger,
} from "@ecoctrl/ui/autocomplete";

import AppButton from "@/components/AppButton";
import { pointsApi } from "@/api/points";
import type { DataModel, Point, BusinessObject } from "@ecoctrl/shared";

// ========================================
// Schema
// ========================================

function createPointSchema(allPoints: Point[]) {
  return z
    .object({
      modelId: z.string().default(""),
      objectId: z.string().min(1, "请选择模型对象"),
      type: z.string().min(1, "请输入点位类型"),
      code: z.string().min(1, "请输入编码"),
      name: z.string().optional(),
      description: z.string().optional(),
      region: z.string().optional(),
      system: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const duplicate = allPoints.find(
        (p) =>
          p.objectId === data.objectId &&
          p.type === data.type.trim() &&
          p.code === data.code.trim(),
      );
      if (duplicate) {
        ctx.addIssue({
          code: "custom",
          message: `该对象下已存在类型为 "${data.type.trim()}" 且编码为 "${data.code.trim()}" 的点位`,
          path: ["code"],
        });
      }
    });
}

const editPointSchema = z.object({
  code: z.string().min(1, "请输入编码"),
  type: z.string().min(1, "请输入点位类型"),
  name: z.string().optional(),
  description: z.string().optional(),
  region: z.string().optional(),
  system: z.string().optional(),
});

type PointCreateFormData = z.infer<ReturnType<typeof createPointSchema>>;
type PointEditFormData = z.infer<typeof editPointSchema>;

// ========================================
// Props
// ========================================

interface PointCreateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: DataModel[];
  objects: BusinessObject[];
  allPoints: Point[];
  editingPoint: Point | null;
  onSuccess: () => void;
}

// ========================================
// Component
// ========================================

export function PointCreateEditDialog({
  open,
  onOpenChange,
  models,
  objects,
  allPoints,
  editingPoint,
  onSuccess,
}: PointCreateEditDialogProps) {
  const isEditing = !!editingPoint;

  const createSchema = useMemo(() => createPointSchema(allPoints), [allPoints]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<PointCreateFormData | PointEditFormData>({
    resolver: zodResolver((isEditing ? editPointSchema : createSchema) as any),
    defaultValues: isEditing
      ? { code: "", type: "", name: "", description: "", region: "", system: "" }
      : {
          modelId: "",
          objectId: "",
          type: "",
          code: "",
          name: "",
          description: "",
          region: "",
          system: "",
        },
  });

  const watchedModelId = watch("modelId" as any);

  const existingPointTypes = useMemo(() => {
    return [...new Set(allPoints.map((p) => p.type).filter(Boolean))];
  }, [allPoints]);

  const filteredObjects = useMemo(() => {
    if (!watchedModelId) return objects;
    return objects.filter((o) => o.modelId === watchedModelId);
  }, [objects, watchedModelId]);

  // Populate form when dialog opens
  useEffect(() => {
    if (open) {
      if (editingPoint) {
        reset({
          code: editingPoint.code ?? "",
          type: editingPoint.type ?? "",
          name: editingPoint.name ?? "",
          description: editingPoint.description ?? "",
          region: editingPoint.region ?? "",
          system: editingPoint.system ?? "",
        });
      } else {
        reset({
          modelId: "",
          objectId: "",
          type: "",
          code: "",
          name: "",
          description: "",
          region: "",
          system: "",
        });
      }
      clearErrors();
    }
  }, [open, editingPoint, reset, clearErrors]);

  const onSubmit = async (data: PointCreateFormData | PointEditFormData) => {
    try {
      if (isEditing && editingPoint) {
        const editData = data as PointEditFormData;
        await pointsApi.update(editingPoint.id, {
          code: editData.code.trim(),
          type: editData.type.trim(),
          name: editData.name?.trim() || null,
          description: editData.description?.trim() || null,
          region: editData.region?.trim() || null,
          system: editData.system?.trim() || null,
        });
      } else {
        const createData = data as PointCreateFormData;
        await pointsApi.create({
          objectId: createData.objectId,
          modelId: createData.modelId,
          code: createData.code.trim(),
          name: createData.name?.trim() || null,
          type: createData.type.trim(),
          description: createData.description?.trim() || null,
          region: createData.region?.trim() || null,
          system: createData.system?.trim() || null,
          props: [],
          values: {},
        });
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
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isEditing ? <Pencil size={18} /> : <Plus size={18} />}
            {isEditing ? "编辑点位" : "新建点位"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
            <div className="space-y-4">
              {/* Model + Object selects — only in create mode */}
              {!isEditing && (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      选择模型
                    </label>
                    <Controller
                      name="modelId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            setValue("objectId", "");
                          }}
                        >
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
                                <span className="block truncate">{m.name ?? m.code ?? m.id}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      选择对象
                    </label>
                    <Controller
                      name="objectId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            const oid = v ?? "";
                            if (oid) {
                              const obj = objects.find((o) => o.id === oid);
                              if (obj?.modelId) {
                                setValue("modelId", obj.modelId);
                              }
                            }
                          }}
                          disabled={!watchedModelId}
                        >
                          <SelectTrigger className="w-full h-10 py-0">
                            <SelectValue placeholder="请选择对象">
                              {field.value
                                ? (objects.find((o) => o.id === field.value)?.name ??
                                  objects.find((o) => o.id === field.value)?.code ??
                                  "请选择对象")
                                : "请选择对象"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {filteredObjects.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                <span className="block truncate">{o.name ?? o.code ?? o.id}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.objectId && (
                      <p className="text-sm text-destructive mt-1">{errors.objectId.message}</p>
                    )}
                  </div>
                </>
              )}

              {/* Type + Code row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Point Type Autocomplete */}
                <div className="[&_[data-slot=input-group]]:h-10">
                  <label
                    htmlFor="point-type"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    点位类型
                  </label>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        value={field.value}
                        onValueChange={field.onChange}
                        items={existingPointTypes}
                        openOnInputClick
                        filter={() => true}
                      >
                        <AutocompleteInput
                          id="point-type"
                          placeholder="请输入或选择类型"
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
                  {errors.type && (
                    <p className="text-sm text-destructive mt-1">{errors.type.message}</p>
                  )}
                </div>

                {/* Code Input */}
                <div>
                  <label
                    htmlFor="point-code"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    编码
                  </label>
                  <Input
                    id="point-code"
                    placeholder="请输入编码"
                    className="h-10"
                    {...register("code")}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive mt-1">{errors.code.message}</p>
                  )}
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label
                  htmlFor="point-name"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  点位名称
                </label>
                <Input
                  id="point-name"
                  placeholder="请输入点位名称（可选）"
                  className="h-10"
                  {...register("name")}
                />
              </div>

              {/* Description Input */}
              <div>
                <label
                  htmlFor="point-description"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  描述
                </label>
                <Input
                  id="point-description"
                  placeholder="请输入描述（可选）"
                  className="h-10"
                  {...register("description")}
                />
              </div>

              {/* Region Input */}
              <div>
                <label
                  htmlFor="point-region"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  分区
                </label>
                <Input
                  id="point-region"
                  placeholder="请输入分区（可选）"
                  className="h-10"
                  {...register("region")}
                />
              </div>

              {/* System Input */}
              <div>
                <label
                  htmlFor="point-system"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  系统
                </label>
                <Input
                  id="point-system"
                  placeholder="请输入系统（可选）"
                  className="h-10"
                  {...register("system")}
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
                  {isEditing ? "保存" : "确认创建"}
                </>
              )}
            </AppButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
