import {
  ChevronRight,
  Save,
  Bug,
  Loader2,
  Rocket,
  Braces,
  Settings,
  Pencil,
  Cloud,
  CloudOff,
  Check,
  X,
} from "lucide-react";
import { Button } from "@ecoctrl/ui/button";
import { Input } from "@ecoctrl/ui/input";
import { Badge } from "@ecoctrl/ui/badge";
import { Separator } from "@ecoctrl/ui/separator";

interface WorkflowToolbarProps {
  workflowName: string;
  isPublished: boolean;
  isDirty: boolean;
  editingName: boolean;
  editedName: string;
  saving: boolean;
  publishing: boolean;
  testing: boolean;
  saveResult: "idle" | "success" | "error";
  saveMode: "manual" | "auto" | null;
  workflowId: string | null;
  onBack: () => void;
  onNameClick: () => void;
  onNameCommit: () => void;
  onNameCancel: () => void;
  onNameChange: (v: string) => void;
  onNameKeyDown: (e: React.KeyboardEvent) => void;
  onEditDialog: () => void;
  onTestRun: () => void;
  onSave: () => void;
  onPublish: () => void;
  onEnvVars: () => void;
  onSettings: () => void;
}

export function WorkflowToolbar({
  workflowName,
  isPublished,
  isDirty,
  editingName,
  editedName,
  saving,
  publishing,
  testing,
  saveResult,
  saveMode,
  workflowId,
  onBack,
  onNameClick,
  onNameCommit,
  onNameCancel,
  onNameChange,
  onNameKeyDown,
  onEditDialog,
  onTestRun,
  onSave,
  onPublish,
  onEnvVars,
  onSettings,
}: WorkflowToolbarProps) {
  // Save button icon & label
  const saveIcon = (() => {
    if (saving) {
      return saveMode === "auto" ? (
        <Cloud size={14} className="animate-pulse" />
      ) : (
        <Loader2 size={14} className="animate-spin" />
      );
    }
    if (saveResult === "success") {
      return saveMode === "auto" ? (
        <Cloud size={14} className="text-emerald-500" />
      ) : (
        <Check size={14} className="text-green-500" />
      );
    }
    if (saveResult === "error") {
      return saveMode === "auto" ? (
        <CloudOff size={14} className="text-rose-500" />
      ) : (
        <X size={14} className="text-red-500" />
      );
    }
    return <Save size={14} />;
  })();

  const saveLabel = (() => {
    if (saving) return "保存中...";
    if (saveResult === "success") return "已保存";
    if (saveResult === "error") return "保存失败";
    return "保存";
  })();

  return (
    <div className="flex h-12 items-center justify-between border-b bg-white px-4 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={onBack}>
          <ChevronRight size={14} className="rotate-180" />
          <span className="text-sm">返回</span>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        {editingName ? (
          <Input
            value={editedName}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameCommit}
            onKeyDown={onNameKeyDown}
            className="h-7 w-[240px] text-sm font-medium"
            autoFocus
          />
        ) : (
          <>
            <button
              onClick={onNameClick}
              className="max-w-[300px] truncate text-sm font-medium hover:text-primary"
              title="点击修改名称"
            >
              {workflowName}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onEditDialog}
              title="编辑工作流信息"
            >
              <Pencil size={14} />
            </Button>
          </>
        )}
        <Badge variant={isPublished ? "default" : "secondary"} className="text-[10px]">
          {isPublished ? "已发布" : "草稿"}
        </Badge>
        {isDirty && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="有未保存的修改" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onTestRun}
          disabled={saving || publishing || testing}
        >
          {testing ? <Loader2 size={14} className="animate-spin" /> : <Bug size={14} />}
          调试
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 min-w-[72px] justify-center"
          onClick={onSave}
          disabled={saving || publishing || testing}
        >
          {saveIcon}
          {saveLabel}
        </Button>
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={onPublish}
          disabled={saving || publishing || testing || !workflowId}
        >
          {publishing ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
          发布
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          title="环境变量"
          onClick={onEnvVars}
        >
          <Braces size={14} />
          变量
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" title="设置" onClick={onSettings}>
          <Settings size={14} />
        </Button>
      </div>
    </div>
  );
}
