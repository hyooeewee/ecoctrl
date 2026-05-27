import { X, Trash2, Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react";
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
import { useState, useRef } from "react";
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
}: {
  ev: EnvVar;
  idx: number;
  envVars: EnvVar[];
  setEnvVars: (v: EnvVar[]) => void;
  visibleSecrets: Set<string>;
  setVisibleSecrets: (v: Set<string>) => void;
}) {
  const updateValue = (val: unknown) => {
    setEnvVars(envVars.map((v, i) => (i === idx ? { ...v, value: val } : v)));
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

        {ev.type === "boolean" ? (
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
        ) : ev.type === "secret" ? (
          <div className="relative flex-1">
            <Input
              type="text"
              value={ev.value as string}
              onChange={(e) => updateValue(e.target.value)}
              placeholder="值"
              className={`${inputBase} w-full pr-10`}
              style={
                {
                  WebkitTextSecurity: visibleSecrets.has(ev.key) ? "none" : "disc",
                } as React.CSSProperties
              }
            />
            <button
              type="button"
              onClick={() => {
                const next = new Set(visibleSecrets);
                if (next.has(ev.key)) next.delete(ev.key);
                else next.add(ev.key);
                setVisibleSecrets(next);
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              {visibleSecrets.has(ev.key) ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        ) : (
          <Input
            type="text"
            value={ev.value as string}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="值"
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
        </select>

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
  // Env vars dialog: global form/json mode
  const [envVarMode, setEnvVarMode] = useState<"form" | "json">("form");
  const [envVarsJson, setEnvVarsJson] = useState("");
  const [envVarJsonError, setEnvVarJsonError] = useState("");
  const [envVarFullscreen, setEnvVarFullscreen] = useState(false);
  const [jsonShowSecrets, setJsonShowSecrets] = useState(false);
  const editorRef = useRef<
    Parameters<NonNullable<React.ComponentProps<typeof Editor>["onMount"]>>[0] | null
  >(null);

  const syncFormToJson = () => {
    try {
      setEnvVarsJson(JSON.stringify(envVars, null, 2));
      setEnvVarJsonError("");
    } catch {
      setEnvVarsJson("");
    }
  };

  const syncJsonToForm = (): string | undefined => {
    if (!envVarsJson.trim()) return;
    try {
      const parsed = JSON.parse(envVarsJson) as EnvVar[];
      if (!Array.isArray(parsed)) return "JSON 必须为数组格式";
      setEnvVars(parsed);
      setEnvVarJsonError("");
    } catch (e) {
      return e instanceof Error ? e.message : "JSON 格式错误";
    }
  };

  const handleConfirmEnvVars = () => {
    if (envVarMode === "json") {
      const err = syncJsonToForm();
      if (err) {
        setEnvVarJsonError(err);
        return;
      }
    }
    setIsDirty(true);
    setShowEnvVarsDialog(false);
    setEnvVarMode("form");
    setEnvVarsJson("");
    setEnvVarJsonError("");
  };

  const handleOpenChange = (open: boolean) => {
    setShowEnvVarsDialog(open);
    if (!open) {
      setEnvVarMode("form");
      setEnvVarsJson("");
      setEnvVarJsonError("");
      setEnvVarFullscreen(false);
      setJsonShowSecrets(false);
    }
  };

  const getDisplayJson = (): string => {
    if (jsonShowSecrets || !envVarsJson.trim()) return envVarsJson;
    try {
      const parsed = JSON.parse(envVarsJson) as EnvVar[];
      if (!Array.isArray(parsed)) return envVarsJson;
      const masked = parsed.map((item) =>
        item.type === "secret" ? { ...item, value: "***" } : item,
      );
      return JSON.stringify(masked, null, 2);
    } catch {
      return envVarsJson;
    }
  };

  const editorOptions: React.ComponentProps<typeof Editor>["options"] = {
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    formatOnPaste: true,
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
      {envVarFullscreen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant={envVarMode === "form" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  const err = syncJsonToForm();
                  if (err) {
                    setEnvVarJsonError(err);
                    return;
                  }
                  setEnvVarMode("form");
                }}
              >
                表单
              </Button>
              <Button
                variant={envVarMode === "json" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  syncFormToJson();
                  setEnvVarMode("json");
                }}
              >
                JSON
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={jsonShowSecrets ? "隐藏密钥" : "显示密钥"}
                onClick={() => setJsonShowSecrets((v) => !v)}
              >
                {jsonShowSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setEnvVarFullscreen(false);
                  setShowEnvVarsDialog(true);
                }}
              >
                <Minimize2 size={14} />
                退出全屏
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="json"
              value={getDisplayJson()}
              onChange={(v) => setEnvVarsJson(v ?? "")}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              options={{ ...editorOptions, readOnly: !jsonShowSecrets }}
            />
          </div>
          {envVarJsonError && (
            <div className="px-6 py-2 border-t border-red-200 bg-red-50 text-sm text-red-700">
              {envVarJsonError}
            </div>
          )}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setEnvVarFullscreen(false);
                setShowEnvVarsDialog(false);
                setEnvVarMode("form");
                setEnvVarsJson("");
                setEnvVarJsonError("");
                setJsonShowSecrets(false);
              }}
              className="h-10 px-5"
            >
              取消
            </Button>
            <Button onClick={handleConfirmEnvVars} className="h-10 px-5">
              确认
            </Button>
          </div>
        </div>
      ) : (
        <Dialog open={showEnvVarsDialog} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>环境变量</DialogTitle>
              <DialogDescription>
                定义工作流中可引用的变量，如 {"{{ var.API_KEY }}"} 或 {"{{ secret.TOKEN }}"}
              </DialogDescription>
            </DialogHeader>

            {/* Mode toggle */}
            <div className="flex items-center justify-between px-0 py-0">
              <div className="flex items-center gap-1">
                <Button
                  variant={envVarMode === "form" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    if (envVarMode === "json") {
                      const err = syncJsonToForm();
                      if (err) {
                        setEnvVarJsonError(err);
                        return;
                      }
                    }
                    setEnvVarMode("form");
                  }}
                >
                  表单
                </Button>
                <Button
                  variant={envVarMode === "json" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    if (envVarMode === "form") {
                      syncFormToJson();
                    }
                    setEnvVarMode("json");
                  }}
                >
                  JSON
                </Button>
              </div>
              {envVarJsonError && <span className="text-xs text-rose-500">{envVarJsonError}</span>}
            </div>

            <div className="space-y-3 py-2">
              {envVarMode === "form" ? (
                <>
                  {envVars.length === 0 && (
                    <div className="text-muted-foreground py-4 text-center text-sm">
                      暂无环境变量
                    </div>
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
                </>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between border-b px-2 py-1">
                    <span className="text-xs text-muted-foreground">JSON 编辑</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={jsonShowSecrets ? "隐藏密钥" : "显示密钥"}
                        onClick={() => setJsonShowSecrets((v) => !v)}
                      >
                        {jsonShowSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="全屏编辑"
                        onClick={() => {
                          setShowEnvVarsDialog(false);
                          setEnvVarFullscreen(true);
                        }}
                      >
                        <Maximize2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <Editor
                    height="320px"
                    language="json"
                    value={getDisplayJson()}
                    onChange={(v) => {
                      setEnvVarsJson(v ?? "");
                      setEnvVarJsonError("");
                    }}
                    onMount={(editor) => {
                      editorRef.current = editor;
                    }}
                    options={{ ...editorOptions, readOnly: !jsonShowSecrets }}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleConfirmEnvVars}>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
