import { useState, useCallback, useRef } from "react";
import { Maximize2 } from "lucide-react";
import { Badge } from "@ecoctrl/ui/badge";
import { ScrollArea } from "@ecoctrl/ui/scroll-area";

interface TestNodeLog {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  output?: Record<string, unknown>;
  error?: string;
}

interface WorkflowTestPanelProps {
  testResult: {
    status: string;
    error?: string;
    nodeLogs?: TestNodeLog[];
  } | null;
  testLogOpen: boolean;
  onToggle: () => void;
  onFullscreen: () => void;
}

export function WorkflowTestPanel({
  testResult,
  testLogOpen,
  onToggle,
  onFullscreen,
}: WorkflowTestPanelProps) {
  if (!testResult) return null;

  // Resizable panel height
  const [panelHeight, setPanelHeight] = useState(260);
  const isDraggingRef = useRef(false);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!testLogOpen) return;
      e.preventDefault();
      isDraggingRef.current = true;
      const startY = e.clientY;
      const startHeight = panelHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = startY - moveEvent.clientY;
        const next = Math.min(600, Math.max(120, startHeight + delta));
        setPanelHeight(next);
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [panelHeight, testLogOpen],
  );

  return (
    <div
      className={`relative border-t bg-white transition-all duration-300 dark:bg-zinc-900 ${testLogOpen ? "" : "h-0 overflow-hidden border-t-0 opacity-0"}`}
      style={testLogOpen ? { height: panelHeight } : undefined}
    >
      {/* Resize handle */}
      {testLogOpen && (
        <div
          className="absolute -top-1.5 left-0 right-0 z-50 h-3 cursor-row-resize"
          onMouseDown={handleResizeStart}
        >
          <div className="mx-auto h-px w-full bg-transparent transition-colors hover:bg-primary/40" />
        </div>
      )}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">测试运行日志</span>
          <Badge
            variant={testResult.status === "completed" ? "default" : "destructive"}
            className="text-[10px]"
          >
            {testResult.status === "completed" ? "成功" : "失败"}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {testResult.nodeLogs?.length ?? 0} 个节点
          </span>
        </div>
        {testLogOpen && (
          <Maximize2
            size={14}
            className="text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onFullscreen();
            }}
            title="全屏"
          />
        )}
      </button>

      {testLogOpen && (
        <ScrollArea style={{ height: panelHeight - 40 }}>
          <div className="space-y-1 p-3">
            {testResult.nodeLogs?.map((log, i) => (
              <div
                key={`${log.nodeId}-${i}`}
                className={`flex items-start gap-2 rounded-md border p-2 text-xs ${
                  log.status === "completed"
                    ? "border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10"
                    : log.status === "failed"
                      ? "border-rose-100 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-900/10"
                      : "border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/30"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {log.status === "completed" && (
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                  {log.status === "failed" && (
                    <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                  )}
                  {(log.status === "running" || log.status === "skipped") && (
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{log.nodeName}</span>
                    <span className="text-muted-foreground">({log.nodeType})</span>
                    {log.durationMs != null && (
                      <span className="text-muted-foreground ml-auto">{log.durationMs}ms</span>
                    )}
                  </div>
                  {log.error && (
                    <div className="mt-1 text-rose-600 dark:text-rose-400">{log.error}</div>
                  )}
                  {log.output && (
                    <pre className="mt-1 max-h-20 overflow-auto rounded bg-zinc-100 p-1.5 text-[10px] dark:bg-zinc-800">
                      {JSON.stringify(log.output, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
            {testResult.error && (
              <div className="rounded-md border border-rose-100 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-300">
                <strong>执行错误:</strong> {testResult.error}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
