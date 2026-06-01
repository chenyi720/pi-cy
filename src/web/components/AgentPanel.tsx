import { useState, useEffect, useRef } from "react";
import { onWsMessage } from "../api/ws.js";

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

interface SwarmAgentStep {
  agentName: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
  result?: string;
  error?: string;
}

interface SwarmInstance {
  id: string;
  template: string;
  task: string;
  status: "idle" | "running" | "completed" | "failed";
  steps: SwarmAgentStep[];
  createdAt: number;
  updatedAt: number;
}

export function AgentPanel() {
  const [definitions, setDefinitions] = useState<AgentDefinition[]>([]);
  const [instances, setInstances] = useState<AgentInstance[]>([]);
  const [swarms, setSwarms] = useState<SwarmInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"single" | "swarm">("single");

  // Single Agent form
  const [selectedDef, setSelectedDef] = useState("");
  const [singleTask, setSingleTask] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Swarm Form
  const [selectedTemplate, setSelectedTemplate] = useState("coder-reviewer");
  const [swarmTask, setSwarmTask] = useState("");
  const [expandedSwarmId, setExpandedSwarmId] = useState<string | null>(null);
  const [activeStepTab, setActiveStepTab] = useState<Record<string, number>>({});

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAgents = (showLoading = true) => {
    if (showLoading) setLoading(true);
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data: { definitions: AgentDefinition[]; instances: AgentInstance[]; swarms?: SwarmInstance[] }) => {
        setDefinitions(data.definitions || []);
        setInstances(data.instances || []);
        setSwarms(data.swarms || []);
        if (data.definitions?.length > 0 && !selectedDef) {
          setSelectedDef(data.definitions[0].name);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAgents();

    // Listen to WS updates for both single agents and swarms
    const unsubscribe = onWsMessage((msg) => {
      if (msg.type === "swarm_update") {
        const updated = msg.swarm as SwarmInstance;
        setSwarms((prev) => {
          const exists = prev.some((s) => s.id === updated.id);
          if (exists) {
            return prev.map((s) => (s.id === updated.id ? updated : s));
          }
          return [updated, ...prev];
        });
      }
    });

    return () => {
      unsubscribe();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Poll running single agents (ws can sync, but polling is a safe fallback for stdout stream)
  useEffect(() => {
    const hasRunning = instances.some((inst) => inst.status === "running");
    if (hasRunning) {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(() => {
          fetchAgents(false);
        }, 3000);
      }
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [instances]);

  const handleSpawnSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleTask.trim()) return;

    try {
      const res = await fetch("/api/agents/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definition: selectedDef, task: singleTask }),
      });
      if (res.ok) {
        setSingleTask("");
        fetchAgents(false);
      }
    } catch (err) {
      console.error("Failed to spawn agent", err);
    }
  };

  const handleSpawnSwarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swarmTask.trim()) return;

    try {
      const res = await fetch("/api/agents/swarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: selectedTemplate, task: swarmTask }),
      });
      if (res.ok) {
        const spawned: SwarmInstance = await res.json();
        setSwarmTask("");
        setSwarms((prev) => [spawned, ...prev]);
        setExpandedSwarmId(spawned.id);
        setActiveStepTab((prev) => ({ ...prev, [spawned.id]: 0 }));
      }
    } catch (err) {
      console.error("Failed to spawn swarm", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/20 dark:bg-gray-900/20 backdrop-blur-md font-sans">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/30 dark:border-gray-700/30 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("single")}
            className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
              mode === "single"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white/40 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:bg-white/60"
            }`}
          >
            单 Agent 任务
          </button>
          <button
            onClick={() => setMode("swarm")}
            className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
              mode === "swarm"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white/40 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:bg-white/60"
            }`}
          >
            多 Agent 协同 (Swarm)
          </button>
        </div>
        <button
          onClick={() => fetchAgents(true)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mode === "single" ? (
          <>
            {/* Spawn Single Agent Form */}
            <form onSubmit={handleSpawnSingle} className="bg-white/50 dark:bg-gray-850/40 p-4 rounded-2xl border border-white/60 dark:border-gray-700/30 space-y-3 shadow-md">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">指派单智能体任务</div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">选择智能体角色</label>
                <select
                  value={selectedDef}
                  onChange={(e) => setSelectedDef(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 focus:outline-none dark:text-white"
                >
                  {definitions.map((def) => (
                    <option key={def.name} value={def.name}>
                      {def.name.toUpperCase()} - {def.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">任务说明</label>
                <textarea
                  placeholder="请输入需要指派的具体命令或任务描述..."
                  value={singleTask}
                  onChange={(e) => setSingleTask(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 focus:outline-none resize-none dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all flex items-center justify-center gap-1"
              >
                🚀 部署运行 Agent
              </button>
            </form>

            {/* Single Instances List */}
            {loading && instances.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-6">加载中...</div>
            ) : instances.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-6">暂无活跃智能体</div>
            ) : (
              <div className="space-y-3">
                {instances.map((inst) => {
                  const isExpanded = expandedId === inst.id;
                  return (
                    <div
                      key={inst.id}
                      className="bg-white/60 dark:bg-gray-850/50 border border-white/50 dark:border-gray-750 rounded-2xl p-4 shadow-sm hover:bg-white/80 dark:hover:bg-gray-850/80 transition-all cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : inst.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase">
                          {inst.definition} Agent
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1.5 ${
                          inst.status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            : inst.status === "running"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 animate-pulse"
                              : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                        }`}>
                          {inst.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />}
                          {inst.status === "completed" ? "已成功" : inst.status === "running" ? "进行中" : "已失败"}
                        </span>
                      </div>

                      <div className="text-[10px] text-gray-450 mt-1 line-clamp-2">
                        任务: {inst.task}
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/30 dark:border-gray-700/30 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">运行日志</div>
                          <div className="bg-gray-950 text-green-400 p-3 rounded-xl font-mono text-[9.5px] max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-gray-900 shadow-inner">
                            {inst.output || inst.result || inst.error || "(无日志输出)"}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Spawn Swarm Form */}
            <form onSubmit={handleSpawnSwarm} className="bg-white/50 dark:bg-gray-850/40 p-4 rounded-2xl border border-white/60 dark:border-gray-700/30 space-y-3 shadow-md">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">启动 Multi-Agent Swarm 协同</div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">选择协同模板 (Swarm Template)</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 focus:outline-none dark:text-white"
                >
                  <option value="coder-reviewer">💻 Coder-Reviewer Swarm (开发与代码评审链)</option>
                  <option value="research-analyst">🔎 Research-Analyst Swarm (市场调研与数据报告链)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">协同任务描述</label>
                <textarea
                  placeholder="请输入需要协作的复杂任务 (如: 请帮我构建一个带有 Dockerfile 并通过类型校验的 Vite React 示例)..."
                  value={swarmTask}
                  onChange={(e) => setSwarmTask(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 focus:outline-none resize-none dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all flex items-center justify-center gap-1"
              >
                🤝 激活协作 Swarm 团队
              </button>
            </form>

            {/* Swarm Instances List */}
            {swarms.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-6">暂无活跃的 Swarm 团队协作</div>
            ) : (
              <div className="space-y-4">
                {swarms.map((swarm) => {
                  const isExpanded = expandedSwarmId === swarm.id;
                  const activeTab = activeStepTab[swarm.id] ?? 0;
                  return (
                    <div
                      key={swarm.id}
                      className="bg-white/60 dark:bg-gray-850/50 border border-white/50 dark:border-gray-750 rounded-2xl p-4 shadow-sm hover:bg-white/80 dark:hover:bg-gray-850/80 transition-all cursor-pointer animate-fade-in"
                      onClick={() => setExpandedSwarmId(isExpanded ? null : swarm.id)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1">
                          {swarm.template === "coder-reviewer" ? "💻 Coder-Reviewer Swarm" : "🔎 Research-Analyst Swarm"}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1.5 ${
                          swarm.status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            : swarm.status === "running"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 animate-pulse"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {swarm.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />}
                          {swarm.status === "completed" ? "已完成" : swarm.status === "running" ? "协作中" : "待命中"}
                        </span>
                      </div>

                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                        任务: {swarm.task}
                      </div>

                      {/* Visual Agent Collaboration Canvas (Step Nodes) */}
                      <div className="bg-white/30 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-100 dark:border-gray-850/40 flex items-center justify-center gap-6 relative mb-3 overflow-x-auto">
                        {swarm.steps.map((step, idx) => {
                          const isStepActive = step.status === "running";
                          const isStepDone = step.status === "completed";
                          return (
                            <div key={idx} className="flex items-center gap-6">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveStepTab((prev) => ({ ...prev, [swarm.id]: idx }));
                                  setExpandedSwarmId(swarm.id);
                                }}
                                className={`px-4 py-2 rounded-xl border flex flex-col items-center justify-center min-w-28 text-center cursor-pointer transition-all shadow-sm ${
                                  isStepActive
                                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 shadow-blue-500/10 ring-2 ring-blue-500/30 animate-pulse"
                                    : isStepDone
                                      ? "border-green-500 bg-green-50/50 dark:bg-green-900/20 text-green-600 dark:text-green-300"
                                      : "border-gray-200 dark:border-gray-700 bg-white/40 dark:bg-gray-800/40 text-gray-450 dark:text-gray-500"
                                }`}
                              >
                                <span className="text-[10px] font-bold uppercase">{step.agentName}</span>
                                <span className="text-[9px] mt-0.5">
                                  {step.status === "completed" ? "✓ 完成" : step.status === "running" ? "⚙ 激活" : "待命"}
                                </span>
                              </div>

                              {idx < swarm.steps.length - 1 && (
                                <div className="flex items-center">
                                  {/* Pulsing visual connection line */}
                                  <div className={`h-[2px] w-8 ${
                                    isStepDone ? "bg-green-400" : isStepActive ? "bg-blue-400 animate-pulse" : "bg-gray-200 dark:bg-gray-700"
                                  }`} />
                                  <span className={`text-[10px] font-bold -ml-5 ${
                                    isStepDone ? "text-green-500" : isStepActive ? "text-blue-500" : "text-gray-300"
                                  }`}>➔</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/30 dark:border-gray-700/30 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                            {swarm.steps.map((step, idx) => (
                              <button
                                key={idx}
                                onClick={() => setActiveStepTab((prev) => ({ ...prev, [swarm.id]: idx }))}
                                className={`text-[10px] font-medium px-2.5 py-1 rounded transition-all ${
                                  activeTab === idx
                                    ? "bg-slate-200 dark:bg-gray-800 text-slate-800 dark:text-gray-200 font-bold"
                                    : "text-gray-400 hover:text-gray-600"
                                }`}
                              >
                                {step.agentName.toUpperCase()} 输出
                              </button>
                            ))}
                          </div>

                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                            当前选中: {swarm.steps[activeTab]?.agentName.toUpperCase()} Agent 日志
                          </div>
                          <div className="bg-gray-950 text-green-400 p-3 rounded-xl font-mono text-[9.5px] max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-gray-900 shadow-inner">
                            {swarm.steps[activeTab]?.output ||
                              swarm.steps[activeTab]?.result ||
                              swarm.steps[activeTab]?.error ||
                              "(等待 Agent 启动或无输出)"}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
