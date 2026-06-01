import { useState, useEffect, useCallback } from "react";

interface GitFile {
  status: string;
  path: string;
}

interface GitStatus {
  files: GitFile[];
  branch: string | null;
}

interface Props {
  onFileClick: (path: string) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  M: { label: "已修改", color: "text-yellow-600 bg-yellow-50" },
  A: { label: "已添加", color: "text-green-600 bg-green-50" },
  D: { label: "已删除", color: "text-red-600 bg-red-50" },
  R: { label: "已重命名", color: "text-blue-600 bg-blue-50" },
  "?": { label: "未跟踪", color: "text-gray-600 bg-gray-50" },
  "!!": { label: "已忽略", color: "text-gray-400 bg-gray-50" },
  U: { label: "冲突", color: "text-red-700 bg-red-100" },
};

export function GitChangesPanel({ onFileClick }: Props) {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/git/status");
      const data = await res.json();
      setGitStatus(data);
    } catch {
      setGitStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  const files = gitStatus?.files || [];
  const branch = gitStatus?.branch;

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            变更
          </div>
          {branch && (
            <div className="text-xs text-gray-400 mt-0.5">
              分支: <span className="font-mono text-blue-500">{branch}</span>
            </div>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-600 px-1"
          title="刷新"
        >
          {loading ? "..." : "↻"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-gray-400">
            暂无变更
          </div>
        )}
        {files.map((f, i) => {
          const info = STATUS_LABELS[f.status.charAt(0)] || STATUS_LABELS["?"];
          return (
            <button
              key={`${f.path}-${i}`}
              onClick={() => onFileClick(f.path)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-left border-b border-gray-100 dark:border-gray-800"
            >
              <span
                className={`text-[10px] px-1 py-0.5 rounded font-mono ${info.color}`}
              >
                {f.status}
              </span>
              <span className="text-sm truncate font-mono text-gray-700 dark:text-gray-300">
                {f.path}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
