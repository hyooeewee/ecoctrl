import { useState, useRef, useEffect, useCallback } from "react";
import { AlignLeft, Check, Copy, Eye, EyeOff, Maximize2, Minimize2, Upload, X } from "lucide-react";
import { Editor } from "@monaco-editor/react";
import { Textarea } from "@ecoctrl/ui/textarea";
import { Button } from "@ecoctrl/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@ecoctrl/ui/dialog";
import { cn } from "@/lib/utils";

const textareaBaseClasses =
  "min-h-[80px] rounded-md border-0 bg-zinc-50 px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted-foreground/50 " +
  "focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white " +
  "transition-colors resize-y dark:bg-zinc-800/60 dark:focus-visible:bg-zinc-800";

export interface JsonEditorProps {
  /** JSON text value */
  value: string;
  /** Called when JSON text changes */
  onChange: (text: string) => void;
  /** Dialog / page title */
  title?: string;
  /** Description shown below header */
  description?: string;
  /**
   * "inline" = embedded in parent container.
   * "fullscreen" = takes full available height (used by env var fullscreen).
   */
  mode?: "inline" | "fullscreen";
  /**
   * "textarea" = small inline textarea with fullscreen dialog (used by node config).
   * "monaco" = inline Monaco editor (used by VariableEditor JSON mode).
   */
  editor?: "textarea" | "monaco";
  showFormat?: boolean;
  /** Only applies when editor="textarea" */
  showFullscreen?: boolean;
  showImport?: boolean;
  showSecretToggle?: boolean;
  secretVisible?: boolean;
  onToggleSecret?: () => void;
  onImportFile?: (content: string) => void;
  /** Controlled error message */
  error?: string | null;
  /** Extra header actions rendered before the close button */
  headerActions?: React.ReactNode;
  /** Extra footer actions rendered before cancel/confirm */
  footerActions?: React.ReactNode;
  showHeader?: boolean;
  readOnly?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  /** Inline Monaco container height. Defaults to 320px. */
  height?: React.CSSProperties["height"];
  showCopy?: boolean;
  className?: string;
}

function formatJson(source: string): { text: string; error?: string } {
  try {
    const parsed = JSON.parse(source || "{}");
    return { text: JSON.stringify(parsed, null, 2) };
  } catch (e) {
    return { text: source, error: e instanceof Error ? e.message : "JSON 格式错误" };
  }
}

export function JsonEditor({
  value,
  onChange,
  title = "JSON 编辑器",
  description,
  mode = "inline",
  editor = "textarea",
  showFormat = true,
  showFullscreen = true,
  showImport = false,
  showSecretToggle = false,
  secretVisible = false,
  onToggleSecret,
  onImportFile,
  error: controlledError,
  headerActions,
  footerActions,
  onCancel,
  onConfirm,
  showHeader = true,
  readOnly = false,
  height = "320px",
  showCopy = false,
  className,
}: JsonEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<
    Parameters<NonNullable<React.ComponentProps<typeof Editor>["onMount"]>>[0] | null
  >(null);

  const [text, setText] = useState(value);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMaximized, setDialogMaximized] = useState(false);
  const [dialogText, setDialogText] = useState(value);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setText(value);
  }, [value]);

  const error = controlledError ?? localError;

  const handleFormat = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.formatDocument")?.run();
      return;
    }
    const { text: formatted, error: err } = formatJson(text);
    setText(formatted);
    setLocalError(err ?? null);
    if (!err) onChange(formatted);
  }, [editorRef, text, onChange]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImportFile) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content !== undefined) onImportFile(content);
        e.target.value = "";
      };
      reader.readAsText(file);
    },
    [onImportFile],
  );

  const handleOpenDialog = useCallback(() => {
    setDialogText(text);
    setDialogMaximized(false);
    setLocalError(null);
    setDialogOpen(true);
  }, [text]);

  const handleConfirmDialog = useCallback(() => {
    const { text: formatted, error: err } = formatJson(dialogText);
    if (err) {
      setLocalError(err);
      return;
    }
    setText(formatted);
    setLocalError(null);
    onChange(formatted);
    setDialogOpen(false);
  }, [dialogText, onChange]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  const editorOptions: React.ComponentProps<typeof Editor>["options"] = {
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    formatOnPaste: true,
    readOnly,
  };

  // ========================================
  // Header buttons shared between inline/fullscreen Monaco modes
  // ========================================
  const renderHeaderButtons = () => (
    <>
      {showImport && onImportFile && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.env,.txt,application/json,text/plain"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="导入文件"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} />
          </Button>
        </>
      )}
      {showFormat && (
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
      {showCopy && (
        <Button variant="ghost" size="icon" className="h-7 w-7" title="复制" onClick={handleCopy}>
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </Button>
      )}
      {showSecretToggle && onToggleSecret && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={secretVisible ? "隐藏密钥" : "显示密钥"}
          onClick={onToggleSecret}
        >
          {secretVisible ? <EyeOff size={14} /> : <Eye size={14} />}
        </Button>
      )}
      {headerActions}
      {mode === "inline" && editor === "monaco" && (showFullscreen || onConfirm) && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="全屏编辑"
          onClick={handleOpenDialog}
        >
          <Maximize2 size={14} />
        </Button>
      )}
      {mode === "fullscreen" && onCancel && (
        <Button variant="ghost" size="icon" className="h-7 w-7" title="退出全屏" onClick={onCancel}>
          <Minimize2 size={14} />
        </Button>
      )}
      {onCancel && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X size={14} />
        </Button>
      )}
    </>
  );

  // ========================================
  // Shared fullscreen dialog
  // ========================================
  const renderDialog = () => (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex flex-col p-0",
          dialogMaximized
            ? "h-screen w-screen max-w-none rounded-none sm:max-w-none"
            : "h-[90vh] w-[95vw] max-w-6xl sm:max-w-6xl",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-medium">{title}</span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={dialogMaximized ? "退出全屏" : "最大化"}
              onClick={() => setDialogMaximized((v) => !v)}
            >
              {dialogMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="关闭"
              onClick={() => setDialogOpen(false)}
            >
              <X size={14} />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 px-4 py-3">
          <Editor
            height="100%"
            language="json"
            value={dialogText}
            onChange={(v) => {
              setDialogText(v ?? "");
              setLocalError(null);
            }}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
            options={editorOptions}
          />
        </div>
        {error && <p className="px-4 text-xs text-rose-500">{error}</p>}
        <DialogFooter className="border-t px-4 py-3">
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleFormat}>
            格式化
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={handleConfirmDialog}>
              确认
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ========================================
  // Inline textarea mode (node config)
  // ========================================
  if (mode === "inline" && editor === "textarea") {
    return (
      <>
        <div className={cn("relative", className)}>
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setLocalError(null);
              onChange(e.target.value);
            }}
            onBlur={() => {
              const { text: formatted, error: err } = formatJson(text);
              if (!err) {
                setText(formatted);
                onChange(formatted);
              }
            }}
            readOnly={readOnly}
            placeholder='{\n  "key": "value"\n}'
            rows={4}
            className={cn(
              textareaBaseClasses,
              "pr-16 font-mono text-xs",
              error && "ring-1 ring-rose-500 bg-rose-50 dark:bg-rose-950/20",
            )}
          />
          <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5">
            {showFormat && (
              <button
                type="button"
                title="格式化 JSON"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 transition-all hover:bg-muted hover:text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFormat();
                }}
              >
                <AlignLeft size={13} />
              </button>
            )}
            {showFullscreen && (
              <button
                type="button"
                title="全屏编辑"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 transition-all hover:bg-muted hover:text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDialog();
                }}
              >
                <Maximize2 size={13} />
              </button>
            )}
          </div>
          {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
        </div>

        {renderDialog()}
      </>
    );
  }

  // ========================================
  // Inline Monaco mode (VariableEditor JSON mode inside dialog)
  // ========================================
  if (mode === "inline" && editor === "monaco") {
    return (
      <>
        <div className={cn("relative flex flex-col max-h-[85vh]", className)}>
          {showHeader && (
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-medium">{title}</span>
              <div className="flex items-center gap-0.5">{renderHeaderButtons()}</div>
            </div>
          )}
          {!showHeader && showFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1.5 z-10 h-6 w-6"
              title="全屏编辑"
              onClick={handleOpenDialog}
            >
              <Maximize2 size={13} />
            </Button>
          )}
          {description && (
            <div className="shrink-0 px-4 pt-3 pb-0">
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          )}
          {error && (
            <div className="shrink-0 px-4 pt-2 pb-0">
              <p className="text-xs text-rose-500">{error}</p>
            </div>
          )}
          <div className="min-h-0 flex-1 px-4 py-3">
            <div className="h-full w-full" style={{ height }}>
              <Editor
                height="100%"
                language="json"
                value={text}
                onChange={(v) => {
                  setText(v ?? "");
                  setLocalError(null);
                  onChange(v ?? "");
                }}
                onMount={(editor) => {
                  editorRef.current = editor;
                }}
                options={editorOptions}
              />
            </div>
          </div>
          {(footerActions || onCancel || onConfirm) && (
            <div className="flex shrink-0 justify-end gap-2 border-t px-4 py-3">
              {footerActions}
              {onCancel && (
                <Button variant="outline" size="sm" className="h-8" onClick={onCancel}>
                  取消
                </Button>
              )}
              {onConfirm && (
                <Button size="sm" className="h-8" onClick={onConfirm}>
                  确认
                </Button>
              )}
            </div>
          )}
        </div>
        {renderDialog()}
      </>
    );
  }

  // ========================================
  // Fullscreen Monaco mode (VariableEditor fullscreen)
  // ========================================
  return (
    <div className={cn("flex h-full flex-col", className)}>
      {showHeader && (
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-medium">{title}</span>
          <div className="flex items-center gap-0.5">{renderHeaderButtons()}</div>
        </div>
      )}
      <div className="min-h-0 flex-1 px-4 py-3">
        <Editor
          height="100%"
          language="json"
          value={text}
          onChange={(v) => {
            setText(v ?? "");
            setLocalError(null);
            onChange(v ?? "");
          }}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
          options={editorOptions}
        />
      </div>
      {error && <p className="px-4 text-xs text-rose-500">{error}</p>}
      {(footerActions || onCancel || onConfirm) && (
        <div className="flex shrink-0 justify-end gap-2 border-t px-4 py-3">
          {footerActions}
          {onCancel && (
            <Button variant="outline" size="sm" className="h-8" onClick={onCancel}>
              取消
            </Button>
          )}
          {onConfirm && (
            <Button size="sm" className="h-8" onClick={onConfirm}>
              确认
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
