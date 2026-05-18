import { ChevronRight, ChevronDown } from "lucide-react";
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
}

export function WorkflowTestPanel({ testResult, testLogOpen, onToggle }: WorkflowTestPanelProps) {
  if (!testResult) return null;

  return (
    <div
      className={`border-t bg-white transition-all duration-300 dark:bg-zinc-900 ${testLogOpen ? "h-[260px]" : "h-10"}`}
    >
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
        {testLogOpen ? (
          <ChevronDown size={14} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground" />
        )}
      </button>

      {testLogOpen && (
        <ScrollArea className="h-[calc(260px-40px)]">
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
