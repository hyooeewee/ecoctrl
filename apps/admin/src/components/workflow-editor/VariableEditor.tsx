import {
  X,
  Trash2,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Braces,
  Scroll,
  AlignLeft,
} from "lucide-react";
import { Button } from "@ecoctrl/ui/button";
import { Input } from "@ecoctrl/ui/input";
import { Switch } from "@ecoctrl/ui/switch";
import { useState, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import type { EnvVar } from "./types";

// ========================================
// Key Value Row — card layout
// ========================================

function VariableRow({
  item,
  idx,
  items,
  setItems,
  visibleSecrets,
  setVisibleSecrets,
}: {
  item: EnvVar;
  idx: number;
  items: EnvVar[];
  setItems: (v: EnvVar[]) => void;
  visibleSecrets: Set<string>;
  setVisibleSecrets: (v: Set<string>) => void;
}) {
  const updateValue = (val: unknown) => {
    setItems(items.map((v, i) => (i === idx ? { ...v, value: val } : v)));
  };

  const toggleVisibility = () => {
    const next = new Set(visibleSecrets);
    if (next.has(item.key)) next.delete(item.key);
    else next.add(item.key);
    setVisibleSecrets(next);
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={item.key}
          onChange={(e) =>
            setItems(items.map((v, i) => (i === idx ? { ...v, key: e.target.value } : v)))
          }
          placeholder="变量名"
          className="h-7 border-0 bg-transparent px-0 text-xs font-medium focus-visible:ring-0"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-rose-500"
          onClick={() => setItems(items.filter((_, i) => i !== idx))}
        >
          <Trash2 size={13} />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {item.type === "boolean" ? (
          <div className="flex h-8 flex-1 items-center">
            <Switch
              checked={item.value as boolean}
              onCheckedChange={(checked) => updateValue(checked)}
            />
          </div>
        ) : item.type === "number" ? (
          <Input
            type="number"
            value={item.value as number}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : Number(e.target.value);
              updateValue(val);
            }}
            placeholder="值"
            className="h-8 flex-1 text-xs"
          />
        ) : item.type === "secret" ? (
          <Input
            type="text"
            value={item.value as string}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="值"
            className="h-8 flex-1 text-xs"
            style={
              {
                WebkitTextSecurity: visibleSecrets.has(item.key) ? "none" : "disc",
              } as React.CSSProperties
            }
          />
        ) : (
          <Input
            type="text"
            value={item.value as string}
            onChange={(e) => updateValue(e.target.value)}
            placeholder="值"
            className="h-8 flex-1 text-xs"
          />
        )}

        <select
          value={item.type}
          onChange={(e) =>
            setItems(
              items.map((v, i) =>
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

        {item.type === "secret" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            title={visibleSecrets.has(item.key) ? "隐藏" : "显示"}
            onClick={toggleVisibility}
          >
            {visibleSecrets.has(item.key) ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
        )}
      </div>
    </div>
  );
}

// ========================================
// Key Value Editor
// ========================================

export interface VariableEditorProps {
  items: EnvVar[];
  setItems: (v: EnvVar[]) => void;
  visibleSecrets: Set<string>;
  setVisibleSecrets: (v: Set<string>) => void;
  setIsDirty: (v: boolean) => void;
  onClose: () => void;
  onEnterFullscreen?: () => void;
  onExitFullscreen?: () => void;
  fullscreen?: boolean;
  title?: string;
  description?: string;
  emptyText?: string;
  addButtonText?: string;
}

export function VariableEditor({
  items,
  setItems,
  visibleSecrets,
  setVisibleSecrets,
  setIsDirty,
  onClose,
  onEnterFullscreen,
  onExitFullscreen,
  fullscreen = false,
  title = "环境变量",
  description = "定义工作流中可引用的变量，如 {{ var.API_KEY }} 或 {{ secret.TOKEN }}",
  emptyText = "暂无环境变量",
  addButtonText = "+ 添加变量",
}: VariableEditorProps) {
  const [editorMode, setEditorMode] = useState<"form" | "json">("form");
  const [itemsJson, setItemsJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [jsonShowSecrets, setJsonShowSecrets] = useState(false);
  const editorRef = useRef<
    Parameters<NonNullable<React.ComponentProps<typeof Editor>["onMount"]>>[0] | null
  >(null);

  const syncFormToJson = () => {
    try {
      setItemsJson(JSON.stringify(items, null, 2));
      setJsonError("");
    } catch {
      setItemsJson("");
    }
  };

  const syncJsonToForm = (): string | undefined => {
    if (!itemsJson.trim()) return;
    try {
      const parsed = JSON.parse(itemsJson) as EnvVar[];
      if (!Array.isArray(parsed)) return "JSON 必须为数组格式";
      setItems(parsed);
      setJsonError("");
    } catch (e) {
      return e instanceof Error ? e.message : "JSON 格式错误";
    }
  };

  const handleConfirm = () => {
    if (editorMode === "json") {
      const err = syncJsonToForm();
      if (err) {
        setJsonError(err);
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
    if (editorMode === "json") {
      const err = syncJsonToForm();
      if (err) {
        setJsonError(err);
        return;
      }
    } else {
      syncFormToJson();
    }
    setEditorMode((m) => (m === "form" ? "json" : "form"));
  };

  const handleEnterFullscreen = () => {
    if (editorMode === "json") {
      const err = syncJsonToForm();
      if (err) {
        setJsonError(err);
        return;
      }
    } else {
      syncFormToJson();
    }
    onEnterFullscreen?.();
  };

  const handleExitFullscreen = () => {
    if (editorMode === "json") {
      const err = syncJsonToForm();
      if (err) {
        setJsonError(err);
        return;
      }
    }
    onExitFullscreen?.();
  };

  const handleFormat = () => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const getDisplayJson = (): string => {
    const source = !itemsJson.trim() ? items : (JSON.parse(itemsJson) as EnvVar[]);
    if (!Array.isArray(source)) return itemsJson;
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
          <span className="text-sm font-medium">{title}</span>
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
              title="格式化"
              onClick={handleFormat}
            >
              <AlignLeft size={14} />
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
                setItemsJson(v ?? "");
                setJsonError("");
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
        <span className="text-sm font-medium">{title}</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={editorMode === "form" ? "切换到 JSON 视图" : "切换到表单视图"}
            onClick={toggleMode}
          >
            {editorMode === "form" ? <Braces size={14} /> : <Scroll size={14} />}
          </Button>
          {editorMode === "json" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="格式化"
              onClick={handleFormat}
            >
              <AlignLeft size={14} />
            </Button>
          )}
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
        <p className="text-xs text-muted-foreground">{description}</p>
        {jsonError && (
          <span className="mt-1 block text-xs text-rose-500">{jsonError}</span>
        )}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
        {editorMode === "form" ? (
          <div className="space-y-3">
            {items.length === 0 && (
              <div className="text-muted-foreground py-8 text-center text-sm">{emptyText}</div>
            )}
            {items.map((item, idx) => (
              <VariableRow
                key={idx}
                item={item}
                idx={idx}
                items={items}
                setItems={setItems}
                visibleSecrets={visibleSecrets}
                setVisibleSecrets={setVisibleSecrets}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                setItems([
                  ...items,
                  { key: `VAR_${items.length + 1}`, value: "", type: "string" },
                ])
              }
            >
              {addButtonText}
            </Button>
          </div>
        ) : (
          <div className="h-[320px]">
            <Editor
              height="100%"
              language="json"
              value={getDisplayJson()}
              onChange={(v) => {
                setItemsJson(v ?? "");
                setJsonError("");
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
