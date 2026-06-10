/**
 * AsyncActionButton — Button that shows loading/success/error states inside itself,
 * then auto-resets to idle after a delay.
 *
 * Also exports useAsyncAction for custom layouts (e.g. success badge beside button).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@ecoctrl/ui/button";
import type { ButtonProps } from "@ecoctrl/ui/button";

// ========================================
// Hook
// ========================================

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export function useAsyncAction(resetDelay = 3000) {
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const execute = useCallback(
    async (action: () => Promise<void>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus("loading");
      try {
        await action();
        setStatus("success");
      } catch {
        setStatus("error");
      }
      timerRef.current = setTimeout(() => setStatus("idle"), resetDelay);
    },
    [resetDelay],
  );

  return { status, execute };
}

// ========================================
// Component
// ========================================

export interface AsyncActionButtonProps extends Omit<ButtonProps, "onClick" | "disabled"> {
  action: () => Promise<void>;
  idle?: React.ReactNode;
  loading?: React.ReactNode;
  success?: React.ReactNode;
  error?: React.ReactNode;
  idleIcon?: React.ReactNode | null;
  loadingIcon?: React.ReactNode | null;
  successIcon?: React.ReactNode | null;
  errorIcon?: React.ReactNode | null;
  resetDelay?: number;
  disabled?: boolean;
}

const DEFAULT_LABELS = {
  idle: "提交",
  loading: "处理中...",
  success: "成功",
  error: "失败",
};

const DEFAULT_ICONS: Record<AsyncStatus, React.ReactNode> = {
  idle: null,
  loading: <Loader2 size={14} className="mr-1.5 animate-spin" />,
  success: <Check size={14} className="mr-1.5 text-green-500" />,
  error: <X size={14} className="mr-1.5 text-red-500" />,
};

function statusIcon(
  status: AsyncStatus,
  icons: Record<AsyncStatus, React.ReactNode | null | undefined>,
) {
  const icon = icons[status];
  if (icon === null) return null;
  return icon ?? DEFAULT_ICONS[status];
}

function statusLabel(
  status: AsyncStatus,
  props: Pick<AsyncActionButtonProps, "idle" | "loading" | "success" | "error">,
) {
  switch (status) {
    case "loading":
      return props.loading ?? DEFAULT_LABELS.loading;
    case "success":
      return props.success ?? DEFAULT_LABELS.success;
    case "error":
      return props.error ?? DEFAULT_LABELS.error;
    default:
      return props.idle ?? DEFAULT_LABELS.idle;
  }
}

export default function AsyncActionButton({
  action,
  idle,
  loading,
  success,
  error,
  idleIcon,
  loadingIcon,
  successIcon,
  errorIcon,
  resetDelay = 3000,
  disabled,
  children,
  ...buttonProps
}: AsyncActionButtonProps) {
  const { status, execute } = useAsyncAction(resetDelay);

  const handleClick = async () => {
    await execute(action);
  };

  const resolvedIdle = idle ?? children;
  const icons = { idle: idleIcon, loading: loadingIcon, success: successIcon, error: errorIcon };

  return (
    <Button {...buttonProps} onClick={handleClick} disabled={disabled || status === "loading"}>
      {statusIcon(status, icons)}
      {statusLabel(status, { idle: resolvedIdle, loading, success, error })}
    </Button>
  );
}
