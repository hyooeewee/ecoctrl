/**
 * Log Viewer Page — Full-screen log viewer for execution and test logs
 */
import { useEffect, useState } from "react";
import LogViewer from "@/components/LogViewer";
import { useAppStore } from "@/store/appStore";
import { workflowsApi } from "@/api/workflows";
import type { WorkflowExecution } from "@/components/workflow-editor/types";

export default function LogViewerPage() {
  const logData = useAppStore((state) => state.logViewerData);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const setLogViewerData = useAppStore((state) => state.setLogViewerData);

  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logData) {
      setActiveTab("workflows");
      return;
    }

    if (logData.type === "test") {
      // Test logs are already fully loaded; nothing to fetch
      return;
    }

    if (logData.type === "execution" && logData.executionId) {
      setLoading(true);
      setError(null);
      workflowsApi
        .getExecution(logData.workflowId, logData.executionId)
        .then((data) => {
          setExecution(data);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "加载失败");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [logData, setActiveTab]);

  const handleBack = () => {
    const returnTab = logData?.returnTab ?? "workflows";
    setLogViewerData(null);
    setActiveTab(returnTab);
  };

  if (!logData) return null;

  if (logData.type === "test") {
    const testResult = logData.testResult;
    if (!testResult) return null;

    return (
      <LogViewer
        title="测试运行日志"
        status={testResult.status}
        error={testResult.error}
        nodeLogs={testResult.nodeLogs}
        onBack={handleBack}
      />
    );
  }

  // execution type
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
      onBack={handleBack}
      loading={loading}
      loadError={error}
    />
  );
}
