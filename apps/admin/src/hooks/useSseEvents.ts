import { useEffect, useRef } from "react";
import { useSse } from "./useSse";
import type { SseEventMap, SseEventType } from "@/types/sse";

export type SseEventHandler<T extends SseEventType> = (event: SseEventMap[T]) => void;

export function useSseEvents() {
  const { addHandler } = useSse();
  const handlersRef = useRef<{
    workflow_execution: Set<SseEventHandler<"workflow_execution">>;
    workflow_node_status: Set<SseEventHandler<"workflow_node_status">>;
    alert: Set<SseEventHandler<"alert">>;
    notification: Set<SseEventHandler<"notification">>;
    ping: Set<SseEventHandler<"ping">>;
  }>({
    workflow_execution: new Set(),
    workflow_node_status: new Set(),
    alert: new Set(),
    notification: new Set(),
    ping: new Set(),
  });

  useEffect(() => {
    const remove = addHandler((msg) => {
      const set = handlersRef.current[msg.type as SseEventType];
      if (!set) return;
      set.forEach((h) => {
        try {
          (h as (event: unknown) => void)(msg.payload);
        } catch {
          // Ignore handler errors
        }
      });
    });
    return remove;
  }, [addHandler]);

  function onWorkflowExecution(handler: SseEventHandler<"workflow_execution">) {
    handlersRef.current.workflow_execution.add(handler);
    return () => {
      handlersRef.current.workflow_execution.delete(handler);
    };
  }

  function onWorkflowNodeStatus(handler: SseEventHandler<"workflow_node_status">) {
    handlersRef.current.workflow_node_status.add(handler);
    return () => {
      handlersRef.current.workflow_node_status.delete(handler);
    };
  }

  function onAlert(handler: SseEventHandler<"alert">) {
    handlersRef.current.alert.add(handler);
    return () => {
      handlersRef.current.alert.delete(handler);
    };
  }

  function onNotification(handler: SseEventHandler<"notification">) {
    handlersRef.current.notification.add(handler);
    return () => {
      handlersRef.current.notification.delete(handler);
    };
  }

  return { onWorkflowExecution, onWorkflowNodeStatus, onAlert, onNotification };
}
