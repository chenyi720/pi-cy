import { useState } from "react";
import type { ToolCall } from "../stores/chat";

interface Props {
  toolCalls: ToolCall[];
}

export function ToolCallPanel({ toolCalls }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!toolCalls.length) return null;

  return (
    <div className="mt-2 space-y-1">
      {toolCalls.map((tc) => {
        const isOpen = expanded.has(tc.id);
        const statusIcon =
          tc.status === "running"
            ? "⏳"
            : tc.status === "success"
              ? "✅"
              : "❌";
        const duration = tc.endTime
          ? `${((tc.endTime - tc.startTime) / 1000).toFixed(1)}s`
          : "...";

        return (
          <div
            key={tc.id}
            className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => toggle(tc.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            >
              <span>{statusIcon}</span>
              <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                {tc.name}
              </span>
              <span className="text-gray-400 text-xs ml-auto">{duration}</span>
              <span className="text-gray-400 text-xs">
                {isOpen ? "▼" : "▶"}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-gray-200 dark:border-gray-700">
                <div className="px-3 py-2 text-xs">
                  <div className="text-gray-500 mb-1">Arguments:</div>
                  <pre className="bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto text-xs">
                    {safeJsonFormat(tc.arguments)}
                  </pre>
                </div>
                {tc.result && (
                  <div className="px-3 py-2 text-xs border-t border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 mb-1">Result:</div>
                    <pre className="bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto text-xs max-h-60 overflow-y-auto whitespace-pre-wrap">
                      {tc.result}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function safeJsonFormat(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
