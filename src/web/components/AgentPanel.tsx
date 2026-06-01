import { useState, useEffect, useRef } from "react";

interface AgentDefinition {
  name: string;
  description: string;
}

interface AgentInstance {
  id: string;
  definition: string;
  status: "running" | "completed" | "failed";
  task: string;
  output?: string;
  result?: string;
  error?: string;
  createdAt: number;
}

export function AgentPanel() {
  const [definitions, setDefinitions] = useState<AgentDefinition[]>([]);
  const [instances, setInstances] = useState<AgentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDef, setSelectedDef] = useState("");
  const [task, setTask] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAgents = (showLoading = true) => {
    if (showLoading) setLoading(true);
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data: { definitions: AgentDefinition[]; instances: AgentInstance[] }) => {
        setDefinitions(data.definitions || []);
        setInstances(data.instances || []);
        if (data.definitions?.length > 0 && !selectedDef) {
          setSelectedDef(data.definitions[0].name);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAgents();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Poll running agents output
  useEffect(() => {
    const hasRunning = instances.some((inst) => inst.status === "running");
    if (hasRunning) {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(() => {
          fetchAgents(false);
        }, 2000);
      }
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [instances]);

  const handleSpawn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;

    try {
      const res = await fetch("/api/agents/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definition: selectedDef, task }),
      });
      if (res.ok) {
        setTask("");
        fetchAgents();
      }
    } catch (err) {
      console.error("Failed to spawn agent", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/20 dark:bg-gray-900/20 backdrop-blur-md">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/30 dark:border-gray-700/30 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          自主智能体 (Agents)
        </span>
        <button
          onClick={() => fetchAgents(true)}
          className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Spawn Agent Form */}
        <form onSubmit={handleSpawn} className="bg-white/40 dark:bg-gray-855/40 p-3 rounded-xl border border-white/50 dark:border-gray-700/30 space-y-2.5 shadow-sm">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">生成自主 AI 智能体</div>
          
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400">选择 Agent 角色</label>
            <select
              value={selectedDef}
              onChange={(e) => setSelectedDef(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/40 dark:border-gray-650 bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
            >
              {definitions.map((def) => (
                <option key={def.name} value={def.name}>
                  {def.name} - {def.description}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-gray-400">指派的编程任务</label>
            <textarea
              placeholder="请输入您要指派的任务 (例如: 编写对 rpc.ts 的单元测试)..."
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={3}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/40 dark:border-gray-650 bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-1.5 text-xs font-medium rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white shadow-sm transition-all flex items-center justify-center gap-1"
          >
            🚀 生成并启动 Agent
          </button>
        </form>

        {/* Instances List */}
        {loading && instances.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">加载中...</div>
        ) : instances.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">暂无活跃智能体</div>
        ) : (
          <div className="space-y-3">
            {instances.map((inst) => {
              const isExpanded = expandedId === inst.id;
              return (
                <div
                  key={inst.id}
                  className="bg-white/60 dark:bg-gray-850/60 border border-white/40 dark:border-gray-700/40 rounded-xl p-3 shadow-sm hover:bg-white/80 dark:hover:bg-gray-850/80 transition-all cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : inst.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 uppercase">
                      {inst.definition} Agent
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                      inst.status === "completed"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : inst.status === "running"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    }`}>
                      {inst.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />}
                      {inst.status === "completed" ? "已完成" : inst.status === "running" ? "运行中" : "已失败"}
                    </span>
                  </div>

                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    任务: {inst.task}
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/30 dark:border-gray-700/30 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">运行日志 (Live Log)</div>
                      <div className="bg-slate-950 text-green-400 p-2 rounded-lg font-mono text-[9.5px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-normal border border-gray-900 shadow-inner">
                        {inst.output || inst.result || inst.error || "(无日志输出)"}
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
