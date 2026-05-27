import { useEffect, useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecoctrl/ui/dialog";
import { Badge } from "@ecoctrl/ui/badge";
import { Separator } from "@ecoctrl/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  SkipForward,
  ChevronRight,
  ChevronDown,
  Clock,
  Terminal,
  AlertTriangle,
} from "lucide-react";
import { workflowsApi } from "@/api/workflows";
import type { WorkflowExecution } from "@/components/workflow-editor/types";

interface ExecutionLogViewerProps {
  workflowId: string;
  executionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 size={16} className="text-green-500" />;
    case "failed":
      return <XCircle size={16} className="text-red-500" />;
    case "running":
      return <Loader2 size={16} className="animate-spin text-amber-500" />;
    case "skipped":
      return <SkipForward size={16} className="text-muted-foreground" />;
    default:
      return <Clock size={16} className="text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "completed"
      ? "default"
      : status === "failed"
        ? "destructive"
        : status === "running"
          ? "secondary"
          : "outline";
  return (
    <Badge variant={variant} className={status === "running" ? "animate-pulse" : ""}>
      {status === "completed"
        ? "已完成"
        : status === "failed"
          ? "失败"
          : status === "running"
            ? "运行中"
            : "已跳过"}
    </Badge>
  );
}

function JsonBlock({ data, title }: { data: unknown; title?: string }) {
  if (data === undefined || data === null) return null;
  const json = JSON.stringify(data, null, 2);
  return (
    <div className="mt-2">
      {title && <p className="text-[10px] font-medium text-muted-foreground mb-1">{title}</p>}
      <pre className="font-mono text-[10px] bg-muted p-2.5 rounded overflow-auto max-h-64">
        <code>{json}</code>
      </pre>
    </div>
  );
}

function NodeLogItem({
  log,
  isFailed,
}: {
  log: WorkflowExecution["nodeLogs"][0];
  isFailed: boolean;
}) {
  const [expanded, setExpanded] = useState(isFailed && log.status === "failed");
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFailed && log.status === "failed" && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isFailed, log.status]);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  return (
    <div ref={itemRef} className="border-b last:border-b-0">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <StatusIcon status={log.status} />
        <span className="text-xs font-medium flex-1">{log.nodeName}</span>
        <span className="text-[10px] text-muted-foreground font-mono">{log.nodeType}</span>
        {log.durationMs !== undefined && (
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
            {log.durationMs}ms
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3 pl-10">
          <div className="space-y-1 text-[11px] text-muted-foreground">
            <p>
              <span className="font-medium">节点 ID:</span> {log.nodeId}
            </p>
            {log.startedAt && (
              <p>
                <span className="font-medium">开始:</span>{" "}
                {new Date(log.startedAt).toLocaleString("zh-CN")}
              </p>
            )}
            {log.completedAt && (
              <p>
                <span className="font-medium">结束:</span>{" "}
                {new Date(log.completedAt).toLocaleString("zh-CN")}
              </p>
            )}
          </div>
          {log.error && (
            <div className="mt-2 flex items-start gap-2 rounded bg-red-50 p-2.5 text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <div className="text-[11px]">
                <p className="font-medium">执行错误</p>
                <p className="mt-0.5">{log.error}</p>
              </div>
            </div>
          )}
          <JsonBlock data={log.output} title="输出 (Output)" />
        </div>
      )}
    </div>
  );
}

export default function ExecutionLogViewer({
  workflowId,
  executionId,
  open,
  onOpenChange,
}: ExecutionLogViewerProps) {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !executionId) {
      setExecution(null);
      return;
    }

    setLoading(true);
    setError(null);
    workflowsApi
      .getExecution(workflowId, executionId)
      .then((data) => {
        setExecution(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, executionId, workflowId]);

  const isFailed = execution?.status === "failed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="inset-0 w-full h-full max-w-none translate-x-0 translate-y-0 p-0 gap-0 rounded-none border-0 flex flex-col">
        <DialogHeader className="px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <Terminal size={16} className="text-muted-foreground" />
            <DialogTitle className="text-sm font-medium">执行详情</DialogTitle>
          </div>
          {execution && (
            <div className="mt-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-[10px] text-muted-foreground">
                  #{execution.id?.slice(0, 8)}
                </span>
                <StatusBadge status={execution.status} />
                {execution.durationMs !== null && execution.durationMs !== undefined && (
                  <span className="text-[10px] text-muted-foreground">
                    耗时 {execution.durationMs}ms
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {new Date(execution.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>
              {execution.errorMessage && (
                <div className="mt-2 flex items-start gap-2 rounded bg-red-50 p-2 text-red-700">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span className="text-[11px]">{execution.errorMessage}</span>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading && (
            <div className="flex h-32 items-center justify-center">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex h-32 items-center justify-center text-sm text-red-500">
              {error}
            </div>
          )}
          {!loading && !error && execution && (
            <>
              {execution.triggerData && (
                <div className="px-5 py-3 border-b">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">触发数据</p>
                  <pre className="font-mono text-[10px] bg-muted p-2.5 rounded overflow-auto max-h-48">
                    <code>{JSON.stringify(execution.triggerData, null, 2)}</code>
                  </pre>
                </div>
              )}

              <div className="px-5 py-2.5 border-b bg-accent/30">
                <p className="text-[11px] font-medium">节点执行日志</p>
              </div>

              {execution.nodeLogs && execution.nodeLogs.length > 0 ? (
                execution.nodeLogs.map((log) => (
                  <NodeLogItem key={log.nodeId} log={log} isFailed={isFailed} />
                ))
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  暂无节点日志
                </div>
              )}

              {execution.result && Object.keys(execution.result).length > 0 && (
                <div className="px-5 py-3 border-t">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">执行结果</p>
                  <JsonBlock data={execution.result} />
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
