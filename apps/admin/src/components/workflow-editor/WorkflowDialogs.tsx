import { X, Trash2 } from "lucide-react";
import { Button } from "@ecoctrl/ui/button";
import { Input } from "@ecoctrl/ui/input";
import { Label } from "@ecoctrl/ui/label";
import { Badge } from "@ecoctrl/ui/badge";
import { Textarea } from "@ecoctrl/ui/textarea";
import { Switch } from "@ecoctrl/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@ecoctrl/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@ecoctrl/ui/sheet";
import { PREDEFINED_TAGS } from "./constants";
import type { EnvVar, WorkflowSettings } from "./types";
import { EnvVarEditor } from "./EnvVarEditor";

interface WorkflowDialogsProps {
  // Edit dialog
  showEditDialog: boolean;
  setShowEditDialog: (v: boolean) => void;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editTags: string[];
  setEditTags: (v: string[]) => void;
  tagInput: string;
  setTagInput: (v: string) => void;
  tagPopoverOpen: boolean;
  setTagPopoverOpen: (v: boolean) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  tagInputRef: React.RefObject<HTMLDivElement | null>;
  onSaveWorkflowInfo: () => void;
  // Leave dialog
  showLeaveDialog: boolean;
  setShowLeaveDialog: (v: boolean) => void;
  onLeave: () => void;
  // Env vars dialog
  showEnvVarsDialog: boolean;
  setShowEnvVarsDialog: (v: boolean) => void;
  envVars: EnvVar[];
  setEnvVars: (v: EnvVar[]) => void;
  visibleSecrets: Set<string>;
  setVisibleSecrets: (v: Set<string>) => void;
  envVarFullscreen: boolean;
  setEnvVarFullscreen: (v: boolean) => void;
  // Settings dialog
  showSettingsDialog: boolean;
  setShowSettingsDialog: (v: boolean) => void;
  settings: WorkflowSettings;
  setSettings: (v: WorkflowSettings) => void;
  setIsDirty: (v: boolean) => void;
}

export function WorkflowDialogs({
  showEditDialog,
  setShowEditDialog,
  editTitle,
  setEditTitle,
  editTags,
  setEditTags,
  tagInput,
  setTagInput,
  tagPopoverOpen,
  setTagPopoverOpen,
  editDescription,
  setEditDescription,
  tagInputRef,
  onSaveWorkflowInfo,
  showLeaveDialog,
  setShowLeaveDialog,
  onLeave,
  showEnvVarsDialog,
  setShowEnvVarsDialog,
  envVars,
  setEnvVars,
  visibleSecrets,
  setVisibleSecrets,
  envVarFullscreen,
  setEnvVarFullscreen,
  showSettingsDialog,
  setShowSettingsDialog,
  settings,
  setSettings,
  setIsDirty,
}: WorkflowDialogsProps) {
  return (
    <>
      {/* Edit workflow info dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑工作流信息</DialogTitle>
            <DialogDescription>修改工作流的标题、标签和描述</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="wf-title" className="text-xs text-muted-foreground">
                标题
              </Label>
              <Input
                id="wf-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="工作流名称"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">标签</Label>
              <div
                ref={tagInputRef}
                className="relative flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-white px-2 py-1 dark:bg-zinc-950"
              >
                {editTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setEditTags(editTags.filter((t) => t !== tag))}
                      className="rounded-full p-0.5 hover:bg-muted"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
                <Input
                  placeholder={editTags.length === 0 ? "输入或选择标签..." : ""}
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setTagPopoverOpen(true);
                  }}
                  onFocus={() => setTagPopoverOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim()) {
                      e.preventDefault();
                      const newTag = tagInput.trim();
                      if (!editTags.includes(newTag)) {
                        setEditTags([...editTags, newTag]);
                      }
                      setTagInput("");
                      setTagPopoverOpen(false);
                    }
                    if (e.key === "Backspace" && !tagInput && editTags.length > 0) {
                      setEditTags(editTags.slice(0, -1));
                    }
                  }}
                  className="h-6 min-w-[80px] flex-1 border-0 bg-transparent px-1 py-0 text-sm shadow-none focus-visible:ring-0"
                />
                {tagPopoverOpen && (
                  <div className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border bg-popover shadow-md">
                    <div className="max-h-48 overflow-y-auto py-1">
                      {PREDEFINED_TAGS.filter(
                        (t) =>
                          !editTags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase()),
                      ).length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {tagInput.trim() ? `按回车添加 "${tagInput.trim()}"` : "暂无可用标签"}
                        </div>
                      ) : (
                        PREDEFINED_TAGS.filter(
                          (t) =>
                            !editTags.includes(t) &&
                            t.toLowerCase().includes(tagInput.toLowerCase()),
                        ).map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              setEditTags([...editTags, t]);
                              setTagInput("");
                              setTagPopoverOpen(false);
                            }}
                          >
                            {t}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf-desc" className="text-xs text-muted-foreground">
                描述
              </Label>
              <Textarea
                id="wf-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="输入工作流描述..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={onSaveWorkflowInfo}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave without saving confirmation */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认离开</DialogTitle>
            <DialogDescription>有未保存的修改，离开后将丢失。是否继续？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
              留在当前页面
            </Button>
            <Button variant="destructive" onClick={onLeave}>
              离开
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Env vars dialog */}
      <Dialog
        open={showEnvVarsDialog && !envVarFullscreen}
        onOpenChange={(open) => {
          setShowEnvVarsDialog(open);
          if (!open) {
            setEnvVarFullscreen(false);
          }
        }}
      >
        <DialogContent className="flex flex-col p-0 sm:max-w-lg" showCloseButton={false}>
          <EnvVarEditor
            envVars={envVars}
            setEnvVars={setEnvVars}
            visibleSecrets={visibleSecrets}
            setVisibleSecrets={setVisibleSecrets}
            setIsDirty={setIsDirty}
            onClose={() => {
              setShowEnvVarsDialog(false);
              setEnvVarFullscreen(false);
            }}
            onEnterFullscreen={() => {
              setShowEnvVarsDialog(false);
              setEnvVarFullscreen(true);
            }}
            fullscreen={false}
          />
        </DialogContent>
      </Dialog>

      {/* Settings sheet */}
      <Sheet open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <SheetContent side="right" className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle>设置</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-4 px-6 py-6">
            <div className="flex items-center justify-between">
              <Label className="text-sm">自动保存</Label>
              <Switch
                checked={settings.autoSave?.enabled ?? false}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    autoSave: { ...settings.autoSave, enabled: checked },
                  })
                }
              />
            </div>
            {settings.autoSave?.enabled && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">自动保存间隔（秒）</Label>
                <Input
                  type="number"
                  min={5}
                  max={300}
                  value={settings.autoSave?.intervalSeconds ?? 30}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      autoSave: {
                        ...settings.autoSave,
                        intervalSeconds: Math.max(5, Math.min(300, Number(e.target.value))),
                      },
                    })
                  }
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                setIsDirty(true);
                setShowSettingsDialog(false);
              }}
            >
              确认
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
