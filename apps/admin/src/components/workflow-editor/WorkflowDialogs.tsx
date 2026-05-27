import { X, Trash2, Eye, EyeOff, Braces } from "lucide-react";
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
import { PREDEFINED_TAGS } from "./constants";
import type { EnvVar, WorkflowSettings } from "./types";
import { useState } from "react";
import { Editor } from "@monaco-editor/react";

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
  // Settings dialog
  showSettingsDialog: boolean;
  setShowSettingsDialog: (v: boolean) => void;
  settings: WorkflowSettings;
  setSettings: (v: WorkflowSettings) => void;
  setIsDirty: (v: boolean) => void;
}

// ========================================
// Env Var Row with JSON mode support
// ========================================

function EnvVarRow({
  ev,
  idx,
  envVars,
  setEnvVars,
  visibleSecrets,
  setVisibleSecrets,
  jsonMode,
  onToggleJsonMode,
}: {
  ev: EnvVar;
  idx: number;
  envVars: EnvVar[];
  setEnvVars: (v: EnvVar[]) => void;
  visibleSecrets: Set<string>;
  setVisibleSecrets: (v: Set<string>) => void;
  jsonMode: boolean;
  onToggleJsonMode: (idx: number) => void;
}) {
  const [jsonError, setJsonError] = useState("");

  const updateValue = (val: unknown) => {
    setEnvVars(envVars.map((v, i) => (i === idx ? { ...v, value: val } : v)));
  };

  const getJsonString = (): string => {
    try {
      return JSON.stringify(ev.value ?? "", null, 2);
    } catch {
      return String(ev.value ?? "");
    }
  };

  const handleJsonChange = (value: string | undefined) => {
    const str = value ?? "";
    try {
      JSON.parse(str);
      setJsonError("");
      updateValue(str);
    } catch {
      setJsonError("JSON 格式错误");
      updateValue(str);
    }
  };

  const inputBase = "h-8 text-xs";

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <Input
          value={ev.key}
          onChange={(e) =>
            setEnvVars(envVars.map((v, i) => (i === idx ? { ...v, key: e.target.value } : v)))
          }
          placeholder="KEY"
          className={`${inputBase} w-[120px]`}
        />

        {jsonMode ? (
          <div className="flex-1 space-y-1">
            <div className="h-[120px] overflow-hidden rounded-md border">
              <Editor
                height="120px"
                language="json"
                value={getJsonString()}
                onChange={handleJsonChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: "off",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  formatOnPaste: true,
                }}
              />
            </div>
            {jsonError && <p className="text-[10px] text-rose-500">{jsonError}</p>}
          </div>
        ) : ev.type === "boolean" ? (
          <Switch
            checked={ev.value as boolean}
            onCheckedChange={(checked) => updateValue(checked)}
          />
        ) : ev.type === "number" ? (
          <Input
            type="number"
            value={ev.value as number}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : Number(e.target.value);
              updateValue(val);
            }}
            placeholder="值"
            className={`${inputBase} flex-1`}
          />
        ) : (
          <Input
            type={ev.type === "secret" && !visibleSecrets.has(ev.key) ? "password" : "text"}
            value={ev.value as string}
            onChange={(e) => updateValue(e.target.value)}
            placeholder={ev.type === "env" ? "环境变量名（如 DATABASE_URL）" : "值"}
            className={`${inputBase} flex-1`}
          />
        )}

        <select
          value={ev.type}
          onChange={(e) =>
            setEnvVars(
              envVars.map((v, i) =>
                i === idx
                  ? {
                      ...v,
                      type: e.target.value as EnvVar["type"],
                      value:
                        e.target.value === "boolean" ? false : e.target.value === "number" ? 0 : "",
                    }
                  : v,
              ),
            )
          }
          className="h-8 rounded-md border bg-white px-2 text-xs dark:bg-zinc-950"
        >
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="secret">secret</option>
          <option value="boolean">boolean</option>
          <option value="env">env</option>
        </select>

        {ev.type === "secret" && !jsonMode && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const next = new Set(visibleSecrets);
              if (next.has(ev.key)) next.delete(ev.key);
              else next.add(ev.key);
              setVisibleSecrets(next);
            }}
          >
            {visibleSecrets.has(ev.key) ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${jsonMode ? "text-primary" : "text-muted-foreground"}`}
          title={jsonMode ? "退出 JSON 模式" : "JSON 编辑模式"}
          onClick={() => onToggleJsonMode(idx)}
        >
          <Braces size={14} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-rose-500"
          onClick={() => setEnvVars(envVars.filter((_, i) => i !== idx))}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
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
  showSettingsDialog,
  setShowSettingsDialog,
  settings,
  setSettings,
  setIsDirty,
}: WorkflowDialogsProps) {
  const [jsonModes, setJsonModes] = useState<Set<number>>(new Set());

  const toggleJsonMode = (idx: number) => {
    setJsonModes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

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
      <Dialog open={showEnvVarsDialog} onOpenChange={setShowEnvVarsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>环境变量</DialogTitle>
            <DialogDescription>
              定义工作流中可引用的变量，如 {"{{ var.API_KEY }}"} 或 {"{{ secret.TOKEN }}"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {envVars.length === 0 && (
              <div className="text-muted-foreground py-4 text-center text-sm">暂无环境变量</div>
            )}
            {envVars.map((ev, idx) => (
              <EnvVarRow
                key={idx}
                ev={ev}
                idx={idx}
                envVars={envVars}
                setEnvVars={setEnvVars}
                visibleSecrets={visibleSecrets}
                setVisibleSecrets={setVisibleSecrets}
                jsonMode={jsonModes.has(idx)}
                onToggleJsonMode={toggleJsonMode}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                setEnvVars([
                  ...envVars,
                  { key: `VAR_${envVars.length + 1}`, value: "", type: "string" },
                ])
              }
            >
              + 添加变量
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnvVarsDialog(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                setIsDirty(true);
                setShowEnvVarsDialog(false);
              }}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
