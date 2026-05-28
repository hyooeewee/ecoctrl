import LogViewer from "@/components/LogViewer";
import type { LogNodeItem } from "@/components/LogViewer";

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

export default function TestLogFullscreenViewer({
  testResult,
  onBack,
}: TestLogFullscreenViewerProps) {
  if (!testResult) return null;

  const nodeLogs: LogNodeItem[] | undefined = testResult.nodeLogs?.map((log) => ({
    nodeId: log.nodeId,
    nodeName: log.nodeName,
    nodeType: log.nodeType,
    status: log.status,
    startedAt: log.startedAt,
    completedAt: log.completedAt,
    durationMs: log.durationMs,
    output: log.output,
    error: log.error,
  }));

  return (
    <LogViewer
      title="测试运行日志"
      status={testResult.status}
      error={testResult.error}
      nodeLogs={nodeLogs}
      onBack={onBack}
    />
  );
}
