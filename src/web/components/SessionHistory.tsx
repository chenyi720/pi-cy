import { useState, useEffect, useCallback } from "react";

interface Session {
  name: string;
  file: string;
  path: string;
  modified: number;
  size: number;
}

interface Props {
  onLoadSession: (path: string) => void;
  currentSessionPath?: string;
}

export function SessionHistory({ onLoadSession, currentSessionPath }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (e: React.MouseEvent, sessionPath: string) => {
    e.stopPropagation();
    if (!confirm("确定删除此会话？")) return;
    try {
      await fetch(`/api/session-detail?path=${encodeURIComponent(sessionPath)}`, {
        method: "DELETE",
      });
      refresh();
    } catch { /* ignore */ }
  };

  const filtered = sessions.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.file.toLowerCase().includes(search.toLowerCase()),
  );

  const formatDate = (ms: number) => {
    const d = new Date(ms);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return d.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            历史会话
          </div>
          <button onClick={refresh} className="text-xs text-gray-400 hover:text-gray-600 px-1">
            {loading ? "..." : "?"}
          </button>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索会话..."
          className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-gray-400">暂无会话</div>
        )}
        {filtered.map((s) => {
          const isActive = s.path === currentSessionPath;
          return (
            <button
              key={s.path}
              onClick={() => onLoadSession(s.path)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 ${isActive ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono truncate text-gray-700 dark:text-gray-300">
                  {s.name.replace(/--/g, "/").slice(0, 30)}
                </span>
                <button
                  onClick={(e) => handleDelete(e, s.path)}
                  className="text-gray-400 hover:text-red-500 text-xs ml-1 shrink-0"
                  title="删除"
                >
                  �?                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                <span>{formatDate(s.modified)}</span>
                <span>{(s.size / 1024).toFixed(1)}KB</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
