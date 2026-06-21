import { useEffect, type ReactNode } from "react";
import { useSseEvents } from "@/hooks/useSseEvents";
import { useSseStore } from "@/store/sseStore";
import { toast } from "sonner";

export function SseProvider({ children }: { children: ReactNode }) {
  const { onAlert, onWorkflowExecution, onNotification } = useSseEvents();
  const incrementUnread = useSseStore((s) => s.incrementUnread);

  useEffect(() => {
    const removeAlert = onAlert((alert) => {
      incrementUnread("alert");
      if (alert.severity === "error") {
        toast.error(alert.title, { description: alert.message });
      } else if (alert.severity === "warning") {
        toast.warning(alert.title, { description: alert.message });
      } else {
        toast.info(alert.title, { description: alert.message });
      }
    });

    const removeWorkflow = onWorkflowExecution((exec) => {
      // Only show toasts for manually triggered workflows;
      // schedule, webhook, event triggers should run silently.
      if (exec.triggerData?.source !== "manual") return;

      if (exec.status === "completed") {
        toast.success("工作流执行成功", {
          id: `workflow-completed-${exec.executionId}`,
          description: `执行 ${exec.executionId.slice(0, 8)} 已完成`,
        });
      } else if (exec.status === "failed") {
        toast.error("工作流执行失败", {
          id: `workflow-failed-${exec.executionId}`,
          description: exec.errorMessage || `执行 ${exec.executionId.slice(0, 8)} 失败`,
        });
      }
    });

    const removeNotification = onNotification((notif) => {
      incrementUnread("notification");
      toast.info(notif.title, { description: notif.message });
    });

    return () => {
      removeAlert();
      removeWorkflow();
      removeNotification();
    };
  }, [onAlert, onWorkflowExecution, onNotification, incrementUnread]);

  return <>{children}</>;
}
