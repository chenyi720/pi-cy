import { useState, useCallback } from "react";

interface ErrorState {
  message: string;
  type: "network" | "api" | "timeout" | "unknown";
  timestamp: number;
  retryable: boolean;
}

export function useErrorHandler() {
  const [errors, setErrors] = useState<ErrorState[]>([]);

  const addError = useCallback(
    (message: string, type: ErrorState["type"] = "unknown", retryable = false) => {
      const error: ErrorState = { message, type, timestamp: Date.now(), retryable };
      setErrors((prev) => [...prev, error]);
      // Auto-dismiss after 10s
      setTimeout(() => {
        setErrors((prev) => prev.filter((e) => e.timestamp !== error.timestamp));
      }, 10000);
    },
    [],
  );

  const dismissError = useCallback((timestamp: number) => {
    setErrors((prev) => prev.filter((e) => e.timestamp !== timestamp));
  }, []);

  const clearErrors = useCallback(() => setErrors([]), []);

  return { errors, addError, dismissError, clearErrors };
}

interface Props {
  errors: Array<{
    message: string;
    type: string;
    timestamp: number;
    retryable: boolean;
  }>;
  onDismiss: (timestamp: number) => void;
  onRetry?: () => void;
}

export function ErrorToast({ errors, onDismiss, onRetry }: Props) {
  if (errors.length === 0) return null;

  const typeIcons: Record<string, string> = {
    network: "🔌",
    api: "⚠️",
    timeout: "⏱️",
    unknown: "❌",
  };

  return (
    <div className="fixed bottom-16 right-4 z-50 space-y-2 max-w-sm">
      {errors.map((err) => (
        <div
          key={err.timestamp}
          className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 shadow-lg flex items-start gap-2 text-sm"
        >
          <span>{typeIcons[err.type] || "❌"}</span>
          <div className="flex-1 min-w-0">
            <div className="text-red-800 dark:text-red-200 break-words">{err.message}</div>
            {err.retryable && onRetry && (
              <button
                onClick={onRetry}
                className="text-xs text-red-600 dark:text-red-400 underline mt-1"
              >
                重试
              </button>
            )}
          </div>
          <button
            onClick={() => onDismiss(err.timestamp)}
            className="text-red-400 hover:text-red-600 shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
