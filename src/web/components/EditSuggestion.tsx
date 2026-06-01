import { useState } from "react";
import { DiffView } from "./Editor";
import { executeToolApi } from "../api/tools";

interface EditSuggestionProps {
  filePath: string;
  oldContent: string;
  newContent: string;
  onAccept?: () => void;
  onReject?: () => void;
}

export function EditSuggestion({
  filePath,
  oldContent,
  newContent,
  onAccept,
  onReject,
}: EditSuggestionProps) {
  const [status, setStatus] = useState<"pending" | "saving" | "accepted" | "rejected">("pending");
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setStatus("saving");
    setError(null);
    try {
      const result = await executeToolApi("write_file", {
        path: filePath,
        content: newContent,
      });
      if (result.error) {
        setError(result.error);
        setStatus("pending");
        return;
      }
      addFileChange(filePath);
      setStatus("accepted");
      onAccept?.();
    } catch (e) {
      setError((e as Error).message);
      setStatus("pending");
    }
  };

  const handleReject = () => {
    setStatus("rejected");
    onReject?.();
  };

  const fileName = filePath.split(/[/\\]/).pop() || filePath;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden my-3">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500">✏️</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {fileName}
          </span>
          <span className="text-[10px] text-gray-400">
            {oldContent.split("\n").length} → {newContent.split("\n").length} 行
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status === "pending" && (
            <>
              <button
                onClick={handleReject}
                className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                拒绝
              </button>
              <button
                onClick={handleAccept}
                className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                接受
              </button>
            </>
          )}
          {status === "saving" && (
            <span className="text-xs text-gray-400">保存中...</span>
          )}
          {status === "accepted" && (
            <span className="text-xs text-green-500">✓ 已接受</span>
          )}
          {status === "rejected" && (
            <span className="text-xs text-gray-400">已拒绝</span>
          )}
        </div>
      </div>
      <div className="h-64">
        <DiffView
          original={oldContent}
          modified={newContent}
          filePath={filePath}
        />
      </div>
      {error && (
        <div className="px-3 py-1 text-xs text-red-500 bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      )}
    </div>
  );
}

function addFileChange(filePath: string): void {
  const stored = localStorage.getItem("pi-cy-file-changes");
  const changes: string[] = stored ? JSON.parse(stored) : [];
  if (!changes.includes(filePath)) {
    changes.push(filePath);
    localStorage.setItem("pi-cy-file-changes", JSON.stringify(changes));
  }
  window.dispatchEvent(new CustomEvent("pi-cy-file-changed", { detail: filePath }));
}
