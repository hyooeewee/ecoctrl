import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { Edge, Node } from "@xyflow/react";

import { workflowsApi } from "@/api/workflows";
import { reactFlowToDSL } from "../transform";
import type { EnvVar, WorkflowDSL, WorkflowListItem, WorkflowSettings } from "../types";

interface UseWorkflowPersistenceOptions {
  dsl: WorkflowDSL | null;
  nodes: Node[];
  edges: Edge[];
  workflowId: string | null;
  workflow: WorkflowListItem | null;
  envVars: EnvVar[];
  settings: WorkflowSettings;
  setDsl: React.Dispatch<React.SetStateAction<WorkflowDSL | null>>;
  setWorkflow: React.Dispatch<React.SetStateAction<WorkflowListItem | null>>;
}

export function useWorkflowPersistence(options: UseWorkflowPersistenceOptions) {
  const { dsl, nodes, edges, workflowId, workflow, envVars, settings, setDsl, setWorkflow } =
    options;

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testLogOpen, setTestLogOpen] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: string;
    error?: string;
    nodeLogs: Array<{
      nodeId: string;
      nodeName: string;
      nodeType: string;
      status: string;
      startedAt?: string;
      completedAt?: string;
      durationMs?: number;
      output?: Record<string, unknown>;
      error?: string;
    }>;
  } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );

  const handleSave = useCallback(
    async (options?: { silent?: boolean; onSuccess?: () => void; onError?: () => void }) => {
      if (!dsl) return;
      setSaving(true);
      if (options?.silent) setAutoSaveStatus("saving");
      try {
        const newDsl: WorkflowDSL = {
          ...reactFlowToDSL(nodes, edges, dsl.trigger),
          envVars,
          settings,
        };
        if (workflowId) {
          await workflowsApi.update(workflowId, {
            name: workflow?.name,
            dsl: newDsl,
          });
        }
        setDsl(newDsl);
        setIsDirty(false);
        if (options?.silent) {
          setAutoSaveStatus("success");
          setTimeout(() => setAutoSaveStatus("idle"), 2000);
        } else {
          toast.success("工作流已保存");
        }
        options?.onSuccess?.();
      } catch (err) {
        if (options?.silent) {
          setAutoSaveStatus("error");
          setTimeout(() => setAutoSaveStatus("idle"), 3000);
        } else {
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            "保存失败，请检查节点连接是否正确";
          toast.error(msg);
        }
        options?.onError?.();
      } finally {
        setSaving(false);
      }
    },
    [dsl, nodes, edges, workflowId, workflow?.name, envVars, settings, setDsl],
  );

  const handlePublish = useCallback(async () => {
    if (!workflowId || !dsl) return;
    setPublishing(true);
    try {
      const newDsl: WorkflowDSL = {
        ...reactFlowToDSL(nodes, edges, dsl.trigger),
        envVars,
        settings,
      };
      await workflowsApi.update(workflowId, {
        name: workflow?.name,
        dsl: newDsl,
        enabled: true,
      });
      setDsl(newDsl);
      setIsDirty(false);
      setWorkflow((prev) => (prev ? { ...prev, enabled: true } : prev));
      toast.success("工作流已发布");
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string; details?: Array<{ message: string }> } } })
          ?.response?.data?.error || "发布失败";
      const details = (err as { response?: { data?: { details?: Array<{ message: string }> } } })
        ?.response?.data?.details;
      if (details && details.length > 0) {
        toast.error(`${msg}: ${details.map((d) => d.message).join("; ")}`);
      } else {
        toast.error(msg);
      }
    } finally {
      setPublishing(false);
    }
  }, [dsl, nodes, edges, workflowId, workflow?.name, envVars, settings, setDsl, setWorkflow]);

  const handleTestRun = useCallback(async () => {
    if (!workflowId) {
      toast.error("请先保存工作流");
      return;
    }
    setTesting(true);
    setTestLogOpen(true);
    try {
      const result = await workflowsApi.test(workflowId);
      setTestResult(result);
      const logCount = result.nodeLogs?.length ?? 0;
      if (result.status === "completed") {
        toast.success(`测试运行成功，共执行 ${logCount} 个节点`);
      } else {
        toast.error(`测试运行失败: ${result.error ?? "未知错误"}`);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "测试运行失败";
      toast.error(msg);
      setTestResult(null);
    } finally {
      setTesting(false);
    }
  }, [workflowId]);

  const handleTestNode = useCallback(
    async (nodeId: string) => {
      if (!workflowId) {
        toast.error("请先保存工作流");
        return;
      }
      setTesting(true);
      try {
        const result = await workflowsApi.test(workflowId, undefined, nodeId);
        setTestResult(result);
        const targetLog = result.nodeLogs?.find((log) => log.nodeId === nodeId);
        if (result.status === "completed" && targetLog?.status === "completed") {
          toast.success("单节点测试成功");
        } else if (targetLog?.status === "failed") {
          toast.error(`单节点测试失败: ${targetLog.error ?? "未知错误"}`);
        } else {
          toast.error(`单节点测试失败: ${result.error ?? "未知错误"}`);
        }
      } catch (err) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "单节点测试失败";
        toast.error(msg);
        setTestResult(null);
      } finally {
        setTesting(false);
      }
    },
    [workflowId],
  );

  // Auto save
  useEffect(() => {
    if (!settings.autoSave?.enabled || !isDirty || !dsl) return;
    const intervalMs = (settings.autoSave.intervalSeconds ?? 30) * 1000;
    const timer = setInterval(() => {
      handleSave({ silent: true });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [settings.autoSave?.enabled, settings.autoSave?.intervalSeconds, isDirty, dsl, handleSave]);

  return {
    saving,
    publishing,
    testing,
    testLogOpen,
    setTestLogOpen,
    testResult,
    isDirty,
    setIsDirty,
    autoSaveStatus,
    handleSave,
    handlePublish,
    handleTestRun,
    handleTestNode,
  };
}
