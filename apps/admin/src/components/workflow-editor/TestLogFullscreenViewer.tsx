import { useState, useCallback, useRef } from "react";
import { Badge } from "@ecoctrl/ui/badge";
import { Button } from "@ecoctrl/ui/button";
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
  ArrowLeft,
} from "lucide-react";

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

interface TestLogFullscreenViewerProps {
  testResult: {
    status: string;
    error?: string;
    nodeLogs?: TestNodeLog[];
  } | null;
  onBack: () => void;
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

function NodeLogItem({ log, isFailed }: { log: TestNodeLog; isFailed: boolean }) {
  const [expanded, setExpanded] = useState(isFailed && log.status === "failed");
  const itemRef = useRef<HTMLDivElement>(null);

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

export default function TestLogFullscreenViewer({
  testResult,
  onBack,
}: TestLogFullscreenViewerProps) {
  if (!testResult) return null;

  const isFailed = testResult.status === "failed";

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 px-5 py-4 border-b flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={onBack} title="返回">
          <ArrowLeft size={16} />
        </Button>
        <Terminal size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">测试运行日志</span>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-muted-foreground">
            {testResult.nodeLogs?.length ?? 0} 个节点
          </span>
          <StatusBadge status={testResult.status} />
        </div>
      </div>

      {testResult.error && (
        <div className="shrink-0 px-5 py-2 flex items-start gap-2 bg-red-50 text-red-700 border-b">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span className="text-[11px]">{testResult.error}</span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-auto">
        <div className="px-5 py-2.5 border-b bg-accent/30">
          <p className="text-[11px] font-medium">节点执行日志</p>
        </div>

        {testResult.nodeLogs && testResult.nodeLogs.length > 0 ? (
          testResult.nodeLogs.map((log) => (
            <NodeLogItem key={log.nodeId} log={log} isFailed={isFailed} />
          ))
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            暂无节点日志
          </div>
        )}
      </div>
    </div>
  );
}
