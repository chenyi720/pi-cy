import { useState, useEffect } from "react";
import { onWsMessage } from "../api/ws.js";

interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  dependencies?: string[];
  command?: string;
  result?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

interface Plan {
  id: string;
  title: string;
  description: string;
  status: "draft" | "executing" | "completed" | "failed";
  steps: PlanStep[];
  completedSteps: number;
  totalSteps: number;
}

interface StepInput {
  title: string;
  description: string;
  command: string;
  dependencies: number[];
}

export function PlanView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepInput[]>([
    { title: "", description: "", command: "", dependencies: [] }
  ]);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const fetchPlans = () => {
    setLoading(true);
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data: Plan[]) => {
        setPlans(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlans();

    // Subscribe to WS updates for real-time progress
    const unsubscribe = onWsMessage((msg) => {
      if (msg.type === "plan_update") {
        const updated = msg.plan as Plan;
        setPlans((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
      } else if (msg.type === "plan_deleted") {
        setPlans((prev) => prev.filter((p) => p.id !== msg.planId));
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAddStep = () => {
    setSteps((prev) => [...prev, { title: "", description: "", command: "", dependencies: [] }]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: keyof StepInput, value: any) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step))
    );
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || steps.some((s) => !s.title.trim())) return;

    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, steps }),
      });
      if (res.ok) {
        setTitle("");
        setDescription("");
        setSteps([{ title: "", description: "", command: "", dependencies: [] }]);
        fetchPlans();
      }
    } catch (err) {
      console.error("Failed to create plan", err);
    }
  };

  const handleUpdateStep = async (planId: string, stepId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/plans/${planId}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId,
          status: newStatus,
          result: newStatus === "completed" ? "手动更新完成" : undefined,
        }),
      });
      if (res.ok) {
        fetchPlans();
      }
    } catch (err) {
      console.error("Failed to update step", err);
    }
  };

  const handleRunStep = async (planId: string, stepId: string) => {
    try {
      await fetch(`/api/plans/${planId}/steps/${stepId}/run`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to execute step command", err);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
      if (res.ok) {
        fetchPlans();
      }
    } catch (err) {
      console.error("Failed to delete plan", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/20 dark:bg-gray-900/20 backdrop-blur-md font-sans">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/30 dark:border-gray-700/30 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          项目实施计划与工作流
        </span>
        <button
          onClick={fetchPlans}
          className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
        >
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Create Plan Form */}
        <form onSubmit={handleCreatePlan} className="bg-white/50 dark:bg-gray-850/40 p-4 rounded-2xl border border-white/60 dark:border-gray-700/30 space-y-3 shadow-md">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">新建实施计划管道</div>
          
          <input
            type="text"
            placeholder="计划名称 (例如: 自动测试与 Lint 部署)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
          />
          <input
            type="text"
            placeholder="计划描述..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
          />

          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">步骤流程编排</div>
            {steps.map((step, index) => (
              <div key={index} className="bg-white/40 dark:bg-gray-800/30 p-3 rounded-xl border border-gray-100 dark:border-gray-850 relative space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Step {index + 1}</span>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(index)}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      删除
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="步骤名称 (必填)"
                    value={step.title}
                    onChange={(e) => handleStepChange(index, "title", e.target.value)}
                    className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 focus:outline-none dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="步骤描述"
                    value={step.description}
                    onChange={(e) => handleStepChange(index, "description", e.target.value)}
                    className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 focus:outline-none dark:text-white"
                  />
                </div>

                <input
                  type="text"
                  placeholder="执行脚本命令 (例如: npm run typecheck, 可空)"
                  value={step.command}
                  onChange={(e) => handleStepChange(index, "command", e.target.value)}
                  className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 focus:outline-none font-mono dark:text-white"
                />

                {index > 0 && (
                  <div className="space-y-1">
                    <div className="text-[9px] text-gray-500">前置依赖步骤:</div>
                    <div className="flex flex-wrap gap-1">
                      {steps.slice(0, index).map((priorStep, pi) => {
                        const isSelected = step.dependencies.includes(pi);
                        return (
                          <button
                            key={pi}
                            type="button"
                            onClick={() => {
                              const newDeps = isSelected
                                ? step.dependencies.filter((d) => d !== pi)
                                : [...step.dependencies, pi];
                              handleStepChange(index, "dependencies", newDeps);
                            }}
                            className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${
                              isSelected
                                ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50"
                                : "bg-white/50 text-gray-500 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700"
                            }`}
                          >
                            Step {pi + 1}: {priorStep.title || `未命名`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddStep}
                className="flex-1 py-1.5 text-xs border border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400 rounded-lg text-gray-500 dark:text-gray-400 text-center font-medium"
              >
                + 添加执行步骤
              </button>
              <button
                type="submit"
                className="px-6 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all"
              >
                发布计划流程
              </button>
            </div>
          </div>
        </form>

        {/* Plan List */}
        {loading && plans.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-6">加载计划中...</div>
        ) : plans.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-6">暂无活动计划，请创建上面的流程。</div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              const progress = plan.totalSteps > 0 ? (plan.completedSteps / plan.totalSteps) * 100 : 0;
              const isExpanded = expandedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  className="bg-white/60 dark:bg-gray-850/50 border border-white/50 dark:border-gray-750 rounded-2xl p-4 shadow-sm hover:bg-white/80 dark:hover:bg-gray-850/80 transition-all cursor-pointer"
                  onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
                        {plan.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                        plan.status === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                          : plan.status === "executing"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : plan.status === "failed"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {plan.status === "completed" ? "已完成" : plan.status === "executing" ? "执行中" : plan.status === "failed" ? "已失败" : "草稿"}
                      </span>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-[9px] text-red-500/80 hover:text-red-500 font-medium"
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  {plan.description && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      {plan.description}
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center text-[9px] text-gray-400 mb-1">
                      <span>已完成 {plan.completedSteps}/{plan.totalSteps} 步骤</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Steps details (expanded) */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/30 dark:border-gray-700/30 space-y-3" onClick={(e) => e.stopPropagation()}>
                      {plan.steps.map((step, idx) => {
                        const stepNum = idx + 1;
                        return (
                          <div key={step.id} className="bg-white/40 dark:bg-gray-800/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800/40 relative">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                  Step {stepNum}: {step.title}
                                </div>
                                {step.description && (
                                  <div className="text-[10px] text-gray-400 mt-0.5">{step.description}</div>
                                )}

                                {step.dependencies && step.dependencies.length > 0 && (
                                  <div className="text-[9px] text-gray-500 mt-1">
                                    依赖: {step.dependencies.map(dId => {
                                      const dIdx = plan.steps.findIndex(s => s.id === dId);
                                      return `Step ${dIdx + 1}`;
                                    }).join(", ")}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {step.command && (
                                  <button
                                    onClick={() => handleRunStep(plan.id, step.id)}
                                    disabled={step.status === "in_progress"}
                                    className={`text-[9px] px-2 py-0.5 rounded shadow-sm font-semibold transition-all ${
                                      step.status === "in_progress"
                                        ? "bg-yellow-500 text-white cursor-not-allowed animate-pulse"
                                        : "bg-blue-600 hover:bg-blue-700 text-white"
                                    }`}
                                  >
                                    {step.status === "in_progress" ? "运行中" : "⚡ 运行"}
                                  </button>
                                )}
                                <select
                                  value={step.status}
                                  onChange={(e) => handleUpdateStep(plan.id, step.id, e.target.value)}
                                  className="text-[9px] px-1.5 py-0.5 bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded focus:outline-none dark:text-white"
                                >
                                  <option value="pending">待处理</option>
                                  <option value="in_progress">进行中</option>
                                  <option value="completed">已完成</option>
                                  <option value="failed">已失败</option>
                                  <option value="skipped">已跳过</option>
                                </select>
                              </div>
                            </div>

                            {step.command && (
                              <div className="mt-2 text-[9px] font-mono bg-gray-900 text-gray-300 p-2 rounded-lg border border-gray-800 overflow-x-auto select-all">
                                $ {step.command}
                              </div>
                            )}

                            {step.result && (
                              <div className="mt-2 text-[9px] bg-green-500/10 text-green-700 dark:text-green-300 p-2 rounded-lg border border-green-500/20 max-h-32 overflow-y-auto font-mono whitespace-pre-wrap">
                                {step.result}
                              </div>
                            )}
                            {step.error && (
                              <div className="mt-2 text-[9px] bg-red-500/10 text-red-700 dark:text-red-300 p-2 rounded-lg border border-red-500/20 max-h-32 overflow-y-auto font-mono whitespace-pre-wrap">
                                {step.error}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
