import { useState, useEffect } from "react";

interface Worktree {
  path: string;
  branch: string;
  head: string;
}

export function GitWorktreePanel() {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorktrees = () => {
    setLoading(true);
    fetch("/api/tools/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: "git_worktree_list", params: {} }),
    })
      .then((r) => r.json())
      .then((data) => {
        const parsed: Worktree[] = [];
        if (data.output) {
          const blocks = data.output.split("\n\n");
          for (const block of blocks) {
            const lines = block.split("\n");
            let path = "";
            let branch = "";
            let head = "";
            for (const line of lines) {
              if (line.startsWith("worktree ")) path = line.slice(9);
              if (line.startsWith("branch ")) branch = line.slice(7).replace("refs/heads/", "");
              if (line.startsWith("HEAD ")) head = line.slice(5, 13);
            }
            if (path) parsed.push({ path, branch, head });
          }
        }
        setWorktrees(parsed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchWorktrees(); }, []);

  const handleRemove = async (worktreePath: string) => {
    if (!confirm(`确定移除工作树？\n${worktreePath}`)) return;
    await fetch("/api/tools/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: "git_worktree_remove", params: { path: worktreePath } }),
    });
    fetchWorktrees();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          工作区 ({worktrees.length})
        </div>
        <button
          onClick={fetchWorktrees}
          className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-xs text-gray-400">加载中...</div>
        ) : worktrees.length === 0 ? (
          <div className="p-3 text-xs text-gray-400">无工作树</div>
        ) : (
          worktrees.map((wt) => (
            <div
              key={wt.path}
              className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                  {wt.branch || "detached"}
                </span>
                <button
                  onClick={() => handleRemove(wt.path)}
                  className="text-[10px] text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                >
                  移除
                </button>
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 truncate" title={wt.path}>
                {wt.path}
              </div>
              {wt.head && (
                <div className="text-[10px] text-gray-400 mt-0.5">
                  HEAD: {wt.head}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
