import { useState, useCallback, useEffect, useRef } from "react";
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
  const [saveResult, setSaveResult] = useState<"idle" | "success" | "error">("idle");
  const [saveMode, setSaveMode] = useState<"manual" | "auto" | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(
    async (options?: { silent?: boolean; onSuccess?: () => void; onError?: () => void }) => {
      if (!dsl) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      setSaving(true);
      setSaveMode(options?.silent ? "auto" : "manual");

      try {
        const newDsl: WorkflowDSL = {
          ...reactFlowToDSL(nodes, edges),
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
        setSaveResult("success");
        saveTimerRef.current = setTimeout(() => {
          setSaveResult("idle");
          setSaveMode(null);
        }, 3000);
        options?.onSuccess?.();
      } catch (err) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          "保存失败";
        console.error("[Workflow Save Error]", msg, err);
        setSaveResult("error");
        saveTimerRef.current = setTimeout(() => {
          setSaveResult("idle");
          setSaveMode(null);
        }, 3000);
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
        ...reactFlowToDSL(nodes, edges),
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
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string; details?: Array<{ message: string }> } } })
          ?.response?.data?.error || "发布失败";
      const details = (err as { response?: { data?: { details?: Array<{ message: string }> } } })
        ?.response?.data?.details;
      console.error("[Workflow Publish Error]", msg, details, err);
    } finally {
      setPublishing(false);
    }
  }, [dsl, nodes, edges, workflowId, workflow?.name, envVars, settings, setDsl, setWorkflow]);

  const handleTestRun = useCallback(async () => {
    if (!workflowId) {
      console.warn("[Workflow Test] Skipped: workflow not saved yet");
      return;
    }
    setTesting(true);
    setTestLogOpen(true);
    try {
      // Save current state before testing
      await handleSave({ silent: true });
      const result = await workflowsApi.test(workflowId);
      setTestResult(result);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "测试运行失败";
      console.error("[Workflow Test Error]", msg, err);
      setTestResult(null);
    } finally {
      setTesting(false);
    }
  }, [workflowId, handleSave]);

  const handleTestNode = useCallback(
    async (nodeId: string) => {
      if (!workflowId) {
        console.warn("[Workflow TestNode] Skipped: workflow not saved yet");
        return;
      }
      setTesting(true);
      try {
        // Save current state before testing
        await handleSave({ silent: true });
        const result = await workflowsApi.test(workflowId, undefined, nodeId);
        setTestResult(result);
      } catch (err) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "单节点测试失败";
        console.error("[Workflow TestNode Error]", msg, err);
        setTestResult(null);
      } finally {
        setTesting(false);
      }
    },
    [workflowId, handleSave],
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
    saveResult,
    saveMode,
    handleSave,
    handlePublish,
    handleTestRun,
    handleTestNode,
  };
}
