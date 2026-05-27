import { X, Trash2, Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@ecoctrl/ui/button";
import { Input } from "@ecoctrl/ui/input";
import { Switch } from "@ecoctrl/ui/switch";
import { useState, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import type { EnvVar } from "./types";

// ========================================
// Env Var Row — card layout
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

  const toggleVisibility = () => {
    const next = new Set(visibleSecrets);
    if (next.has(ev.key)) next.delete(ev.key);
    else next.add(ev.key);
    setVisibleSecrets(next);
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={ev.key}
          onChange={(e) =>
            setEnvVars(envVars.map((v, i) => (i === idx ? { ...v, key: e.target.value } : v)))
          }
          placeholder="变量名"
          className="h-7 border-0 bg-transparent px-0 text-xs font-medium focus-visible:ring-0"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-rose-500"
          onClick={() => setEnvVars(envVars.filter((_, i) => i !== idx))}
        >
          <Trash2 size={13} />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {ev.type === "boolean" ? (
          <div className="flex h-8 flex-1 items-center">
            <Switch
              checked={ev.value as boolean}
              onCheckedChange={(checked) => updateValue(checked)}
            />
          </div>
        ) : ev.type === "number" ? (
          <Input
            type="number"
            value={ev.value as number}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : Number(e.target.value);
              updateValue(val);
            }}
            placeholder="值"
            className="h-8 flex-1 text-xs"
          />
        ) : ev.type === "secret" ? (
          <Input
            type="text"
            value={ev.value as string}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="值"
            className="h-8 flex-1 text-xs"
            style={
              {
                WebkitTextSecurity: visibleSecrets.has(ev.key) ? "none" : "disc",
              } as React.CSSProperties
            }
          />
        ) : (
          <Input
            type="text"
            value={ev.value as string}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="值"
            className="h-8 flex-1 text-xs"
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
          className="h-8 w-28 shrink-0 rounded-md border bg-background px-2 text-xs"
        >
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="secret">secret</option>
          <option value="boolean">boolean</option>
        </select>

        {ev.type === "secret" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            title={visibleSecrets.has(ev.key) ? "隐藏" : "显示"}
            onClick={toggleVisibility}
          >
            {visibleSecrets.has(ev.key) ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
        )}
      </div>
    </div>
  );
}

// ========================================
// Env Var Editor
// ========================================

export interface EnvVarEditorProps {
  envVars: EnvVar[];
  setEnvVars: (v: EnvVar[]) => void;
  visibleSecrets: Set<string>;
  setVisibleSecrets: (v: Set<string>) => void;
  setIsDirty: (v: boolean) => void;
  onClose: () => void;
  onEnterFullscreen?: () => void;
  onExitFullscreen?: () => void;
  fullscreen?: boolean;
}

export function EnvVarEditor({
  envVars,
  setEnvVars,
  visibleSecrets,
  setVisibleSecrets,
  setIsDirty,
  onClose,
  onEnterFullscreen,
  onExitFullscreen,
  fullscreen = false,
}: EnvVarEditorProps) {
  const [envVarMode, setEnvVarMode] = useState<"form" | "json">("form");
  const [envVarsJson, setEnvVarsJson] = useState("");
  const [envVarJsonError, setEnvVarJsonError] = useState("");
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

  const handleConfirm = () => {
    if (envVarMode === "json") {
      const err = syncJsonToForm();
      if (err) {
        setEnvVarJsonError(err);
        return;
      }
    }
    setIsDirty(true);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const toggleMode = () => {
    if (envVarMode === "json") {
      const err = syncJsonToForm();
      if (err) {
        setEnvVarJsonError(err);
        return;
      }
    } else {
      syncFormToJson();
    }
    setEnvVarMode((m) => (m === "form" ? "json" : "form"));
  };

  const handleEnterFullscreen = () => {
    if (envVarMode === "json") {
      const err = syncJsonToForm();
      if (err) {
        setEnvVarJsonError(err);
        return;
      }
    } else {
      syncFormToJson();
    }
    onEnterFullscreen?.();
  };

  const handleExitFullscreen = () => {
    if (envVarMode === "json") {
      const err = syncJsonToForm();
      if (err) {
        setEnvVarJsonError(err);
        return;
      }
    }
    onExitFullscreen?.();
  };

  const getDisplayJson = (): string => {
    const source = !envVarsJson.trim() ? envVars : (JSON.parse(envVarsJson) as EnvVar[]);
    if (!Array.isArray(source)) return envVarsJson;
    if (jsonShowSecrets) return JSON.stringify(source, null, 2);
    const masked = source.map((item) =>
      item.type === "secret" ? { ...item, value: "***" } : item,
    );
    return JSON.stringify(masked, null, 2);
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

  if (fullscreen) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-medium">环境变量</span>
          <div className="flex items-center gap-0.5">
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
              title="退出全屏"
              onClick={handleExitFullscreen}
            >
              <Minimize2 size={14} />
            </Button>
            <span className="text-muted-foreground/30 mx-1 text-xs">|</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
              <X size={14} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 flex flex-col px-4 py-3">
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
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
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" size="sm" className="h-8" onClick={handleCancel}>
            取消
          </Button>
          <Button size="sm" className="h-8" onClick={handleConfirm}>
            确认
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">环境变量</span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleMode}>
            {envVarMode === "form" ? "JSON" : "表单"}
          </Button>
          <span className="text-muted-foreground/30 mx-1 text-xs">|</span>
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
            onClick={handleEnterFullscreen}
          >
            <Maximize2 size={14} />
          </Button>
          <span className="text-muted-foreground/30 mx-1 text-xs">|</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
            <X size={14} />
          </Button>
        </div>
      </div>

      {/* Description */}
      <div className="shrink-0 px-4 pt-3 pb-0">
        <p className="text-xs text-muted-foreground">
          定义工作流中可引用的变量，如 {"{{ var.API_KEY }}"} 或 {"{{ secret.TOKEN }}"}
        </p>
        {envVarJsonError && (
          <span className="mt-1 block text-xs text-rose-500">{envVarJsonError}</span>
        )}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
        {envVarMode === "form" ? (
          <div className="space-y-3">
            {envVars.length === 0 && (
              <div className="text-muted-foreground py-8 text-center text-sm">暂无环境变量</div>
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
          </div>
        ) : (
          <div className="h-[320px]">
            <Editor
              height="100%"
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

      {/* Footer */}
      <div className="flex shrink-0 justify-end gap-2 border-t px-4 py-3">
        <Button variant="outline" size="sm" className="h-8" onClick={handleCancel}>
          取消
        </Button>
        <Button size="sm" className="h-8" onClick={handleConfirm}>
          确认
        </Button>
      </div>
    </div>
  );
}
