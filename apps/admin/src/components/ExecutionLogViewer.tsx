import { useEffect, useState } from "react";
import LogViewer from "./LogViewer";
import { workflowsApi } from "@/api/workflows";
import type { WorkflowExecution } from "@/components/workflow-editor/types";

interface ExecutionLogViewerProps {
  workflowId: string;
  executionId: string;
  onBack: () => void;
}

export default function ExecutionLogViewer({
  workflowId,
  executionId,
  onBack,
}: ExecutionLogViewerProps) {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [executionId, workflowId]);

  if (!execution && !loading && !error) return null;

  return (
    <LogViewer
      title="执行详情"
      status={execution?.status ?? "unknown"}
      error={execution?.errorMessage}
      nodeLogs={execution?.nodeLogs}
      triggerData={execution?.triggerData}
      result={execution?.result}
      id={execution?.id}
      durationMs={execution?.durationMs}
      createdAt={execution?.createdAt}
      onBack={onBack}
      loading={loading}
      loadError={error}
    />
  );
}
