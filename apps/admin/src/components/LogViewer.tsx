import { useState, useCallback, useRef, useEffect } from "react";
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
  Copy,
  Check,
  Braces,
  List,
} from "lucide-react";

// ========================================
// Types
// ========================================

export interface LogNodeItem {
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

export interface LogViewerProps {
  title: string;
  status: string;
  error?: string | null;
  nodeLogs?: LogNodeItem[];
  triggerData?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  id?: string;
  durationMs?: number | null;
  createdAt?: string;
  onBack: () => void;
  loading?: boolean;
  loadError?: string | null;
}

// ========================================
// Sub-components
// ========================================

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
      <span>{copied ? "已复制" : "复制"}</span>
    </button>
  );
}

function JsonBlock({ data, title }: { data: unknown; title?: string }) {
  if (data === undefined || data === null) return null;
  const json = JSON.stringify(data, null, 2);
  return (
    <div className="mt-2">
      {title && (
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-medium text-muted-foreground">{title}</p>
          <CopyButton text={json} />
        </div>
      )}
      <pre className="font-mono text-[10px] bg-muted p-2.5 rounded overflow-auto max-h-64">
        <code>{json}</code>
      </pre>
    </div>
  );
}

function NodeLogItem({ log, isFailed }: { log: LogNodeItem; isFailed: boolean }) {
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
              <div className="text-[11px] flex-1">
                <p className="font-medium">执行错误</p>
                <p className="mt-0.5">{log.error}</p>
              </div>
              <CopyButton text={log.error} />
            </div>
          )}
          <JsonBlock data={log.output} title="输出 (Output)" />
        </div>
      )}
    </div>
  );
}

// ========================================
// Main Component
// ========================================

export default function LogViewer({
  title,
  status,
  error,
  nodeLogs,
  triggerData,
  result,
  id,
  durationMs,
  createdAt,
  onBack,
  loading,
  loadError,
}: LogViewerProps) {
  const isFailed = status === "failed";
  const [viewMode, setViewMode] = useState<"card" | "json">("card");

  const allData = { status, error, nodeLogs, triggerData, result };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 px-5 py-4 border-b flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={onBack} title="返回">
          <ArrowLeft size={16} />
        </Button>
        <Terminal size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {id && (
            <span className="font-mono text-[10px] text-muted-foreground">#{id.slice(0, 8)}</span>
          )}
          <StatusBadge status={status} />
          {durationMs !== null && durationMs !== undefined && (
            <span className="text-[10px] text-muted-foreground">耗时 {durationMs}ms</span>
          )}
          {createdAt && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(createdAt).toLocaleString("zh-CN")}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            title={viewMode === "card" ? "切换到 JSON 视图" : "切换到卡片视图"}
            onClick={() => setViewMode((v) => (v === "card" ? "json" : "card"))}
          >
            {viewMode === "card" ? <Braces size={14} /> : <List size={14} />}
          </Button>
          {viewMode === "json" && <CopyButton text={JSON.stringify(allData, null, 2)} />}
        </div>
      </div>

      {error && viewMode === "card" && (
        <div className="shrink-0 px-5 py-2 flex items-start gap-2 bg-red-50 text-red-700 border-b">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span className="text-[11px] flex-1">{error}</span>
          <CopyButton text={error} />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex h-32 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        )}
        {loadError && (
          <div className="flex h-32 items-center justify-center text-sm text-red-500">
            {loadError}
          </div>
        )}
        {!loading && !loadError && viewMode === "json" && (
          <pre className="font-mono text-[10px] bg-muted p-5 rounded overflow-auto h-full">
            <code>{JSON.stringify(allData, null, 2)}</code>
          </pre>
        )}
        {!loading && !loadError && viewMode === "card" && (
          <>
            {triggerData && (
              <div className="px-5 py-3 border-b">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">触发数据</p>
                  <CopyButton text={JSON.stringify(triggerData, null, 2)} />
                </div>
                <pre className="font-mono text-[10px] bg-muted p-2.5 rounded overflow-auto max-h-48">
                  <code>{JSON.stringify(triggerData, null, 2)}</code>
                </pre>
              </div>
            )}

            <div className="px-5 py-2.5 border-b bg-accent/30">
              <p className="text-[11px] font-medium">节点执行日志</p>
            </div>

            {nodeLogs && nodeLogs.length > 0 ? (
              nodeLogs.map((log) => <NodeLogItem key={log.nodeId} log={log} isFailed={isFailed} />)
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                暂无节点日志
              </div>
            )}

            {result && Object.keys(result).length > 0 && (
              <div className="px-5 py-3 border-t">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">执行结果</p>
                  <CopyButton text={JSON.stringify(result, null, 2)} />
                </div>
                <JsonBlock data={result} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
