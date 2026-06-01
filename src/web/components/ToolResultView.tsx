import { useState } from "react";

interface ToolResultViewProps {
  toolName: string;
  output: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export function ToolResultView({ toolName, output, error }: ToolResultViewProps) {
  const [expanded, setExpanded] = useState(true);

  const getIcon = () => {
    if (toolName === "bash" || toolName === "powershell") return "$";
    if (toolName === "read_file") return "📄";
    if (toolName === "write_file" || toolName === "edit_file") return "✏️";
    if (toolName === "glob") return "🔍";
    if (toolName === "grep") return "🔎";
    if (toolName === "ls") return "📁";
    if (toolName === "web_fetch") return "🌐";
    if (toolName === "web_search") return "🔍";
    return "🔧";
  };

  const getStatusColor = () => {
    if (error) return "text-red-500";
    return "text-green-500";
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden my-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 text-left"
      >
        <span className="text-sm">{getIcon()}</span>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1">
          {toolName}
        </span>
        <span className={`text-xs ${getStatusColor()}`}>
          {error ? "错误" : "成功"}
        </span>
        <span className="text-xs text-gray-400">
          {expanded ? "▲" : "▼"}
        </span>
      </button>
      {expanded && (
        <div className="px-3 py-2">
          {error && (
            <div className="text-xs text-red-500 mb-2 font-mono">
              {error}
            </div>
          )}
          {output && (
            <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded p-2">
              {output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
