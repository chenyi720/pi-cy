import { useState, useEffect } from "react";

interface Task {
  id: string;
  name: string;
  command: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  schedule: "once" | "cron";
  cronExpression?: string;
  result?: string;
  error?: string;
  lastRunAt?: number;
  nextRunAt?: number;
}

export function TaskPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [schedule, setSchedule] = useState<"once" | "cron">("once");
  const [cronExpr, setCronExpr] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const fetchTasks = () => {
    setLoading(true);
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data: Task[]) => {
        setTasks(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !command.trim()) return;
    if (schedule === "cron" && !cronExpr.trim()) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          command,
          schedule,
          cron: schedule === "cron" ? cronExpr : undefined,
        }),
      });
      if (res.ok) {
        setName("");
        setCommand("");
        setCronExpr("");
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/start`, { method: "POST" });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error("Failed to start task", err);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/cancel`, { method: "POST" });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error("Failed to cancel task", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/20 dark:bg-gray-900/20 backdrop-blur-md">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/30 dark:border-gray-700/30 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          任务与定时器 (Tasks & Cron)
        </span>
        <button
          onClick={fetchTasks}
          className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Create Task Form */}
        <form onSubmit={handleCreateTask} className="bg-white/40 dark:bg-gray-855/40 p-3 rounded-xl border border-white/50 dark:border-gray-700/30 space-y-2.5 shadow-sm">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">创建新任务</div>
          
          <input
            type="text"
            placeholder="任务名称 (如: 每晚构建)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/40 dark:border-gray-650 bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
          />

          <input
            type="text"
            placeholder="执行的 Shell 指令 (如: npm run test)"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/40 dark:border-gray-650 bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
          />

          <div className="flex items-center gap-2">
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value as "once" | "cron")}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-white/40 dark:border-gray-650 bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white flex-1"
            >
              <option value="once">执行一次 (Once)</option>
              <option value="cron">定时触发 (Cron)</option>
            </select>

            {schedule === "cron" && (
              <input
                type="text"
                placeholder="Cron 表达式 (如: */5 * * * *)"
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-white/40 dark:border-gray-650 bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white flex-1"
              />
            )}
          </div>

          <button
            type="submit"
            className="w-full py-1.5 text-xs font-medium rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white shadow-sm transition-all"
          >
            保存并注册任务
          </button>
        </form>

        {/* Tasks List */}
        {loading && tasks.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">加载中...</div>
        ) : tasks.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">暂无注册任务</div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              return (
                <div
                  key={task.id}
                  className="bg-white/60 dark:bg-gray-855/60 border border-white/40 dark:border-gray-700/40 rounded-xl p-3 shadow-sm hover:bg-white/80 dark:hover:bg-gray-855/80 transition-all cursor-pointer"
                  onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {task.name}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      task.status === "completed"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : task.status === "running"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse"
                          : task.status === "failed"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {task.status === "completed" ? "已完成" : task.status === "running" ? "运行中" : task.status === "failed" ? "已失败" : "就绪"}
                    </span>
                  </div>

                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">
                    指令: {task.command}
                  </div>

                  {task.schedule === "cron" && (
                    <div className="text-[9px] text-gray-400 mt-1 flex gap-2">
                      <span>表达式: <span className="font-mono">{task.cronExpression}</span></span>
                      {task.lastRunAt && (
                        <span>上次运行: {new Date(task.lastRunAt).toLocaleTimeString()}</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-2.5 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {task.status !== "running" ? (
                      <button
                        onClick={() => handleStartTask(task.id)}
                        className="text-[10px] px-2 py-0.5 border border-white/40 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-850/80 rounded transition-all text-gray-700 dark:text-gray-300 shadow-sm"
                      >
                        运行
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCancelTask(task.id)}
                        className="text-[10px] px-2 py-0.5 border border-red-200/50 bg-red-50/50 hover:bg-red-100/50 rounded transition-all text-red-600 dark:text-red-400 shadow-sm"
                      >
                        中止
                      </button>
                    )}
                  </div>

                  {/* Log details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/30 dark:border-gray-700/30 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">执行输出 (Console Output)</div>
                      <div className="bg-slate-950 text-slate-200 p-2 rounded-lg font-mono text-[9.5px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-normal border border-gray-900 shadow-inner">
                        {task.result || task.error || "(无控制台输出)"}
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
