import { useState, useEffect } from "react";

interface Hook {
  name: string;
  event: "pre-commit" | "post-edit" | "on-error" | "on-start" | "on-save";
  command: string;
  description: string;
  enabled?: boolean;
}

export function HookManager() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [testOutputs, setTestOutputs] = useState<Record<string, string>>({});
  const [testingHookName, setTestingHookName] = useState<string | null>(null);

  const fetchHooks = () => {
    setLoading(true);
    fetch("/api/hooks")
      .then((r) => r.json())
      .then((data: Hook[]) => {
        setHooks(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchHooks();
  }, []);

  const handleTestHook = async (hookName: string, event: string) => {
    setTestingHookName(hookName);
    try {
      const res = await fetch("/api/hooks/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          context: { file: "src/server/index.ts" },
        }),
      });
      const data = await res.json();
      if (data.results) {
        setTestOutputs((prev) => ({
          ...prev,
          [hookName]: data.results.join("\n") || "未产生输出",
        }));
      }
    } catch (err) {
      console.error("Failed to test hook", err);
    } finally {
      setTestingHookName(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/20 dark:bg-gray-900/20 backdrop-blur-md">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/30 dark:border-gray-700/30 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          事件钩子 (Custom Hooks)
        </span>
        <button
          onClick={fetchHooks}
          className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {loading && hooks.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">加载中...</div>
        ) : hooks.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">未注册任何事件钩子</div>
        ) : (
          <div className="space-y-3">
            {hooks.map((hook) => {
              const output = testOutputs[hook.name];
              const isTesting = testingHookName === hook.name;
              return (
                <div
                  key={hook.name}
                  className="bg-white/60 dark:bg-gray-855/60 border border-white/40 dark:border-gray-700/40 rounded-xl p-3 shadow-sm hover:bg-white/80 dark:hover:bg-gray-855/80 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {hook.name}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      hook.enabled !== false
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {hook.enabled !== false ? "已启用" : "未启用"}
                    </span>
                  </div>

                  <div className="text-[10px] text-gray-400 mt-1">
                    {hook.description}
                  </div>

                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-mono bg-white/40 dark:bg-gray-800/40 p-1.5 rounded border border-white/30 dark:border-gray-700/30 truncate">
                    事件: {hook.event} | 命令: {hook.command}
                  </div>

                  {/* Actions */}
                  <div className="mt-2.5 flex justify-end gap-2">
                    <button
                      onClick={() => handleTestHook(hook.name, hook.event)}
                      disabled={isTesting}
                      className="text-[10px] px-2 py-0.5 border border-white/40 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-850/80 rounded transition-all text-gray-700 dark:text-gray-300 shadow-sm"
                    >
                      {isTesting ? "测试中..." : "测试钩子"}
                    </button>
                  </div>

                  {/* Test output output */}
                  {output && (
                    <div className="mt-3 pt-3 border-t border-white/30 dark:border-gray-700/30 space-y-2">
                      <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">最后测试输出 (Last Test Output)</div>
                      <div className="bg-slate-950 text-slate-200 p-2 rounded-lg font-mono text-[9px] max-h-32 overflow-y-auto whitespace-pre-wrap leading-normal border border-gray-900 shadow-inner">
                        {output}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
