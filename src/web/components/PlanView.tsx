import { useState, useEffect } from "react";

interface PlanStep {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  result?: string;
  error?: string;
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

export function PlanView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepsText, setStepsText] = useState("");
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
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !stepsText.trim()) return;

    const steps = stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, steps }),
      });
      if (res.ok) {
        setTitle("");
        setDescription("");
        setStepsText("");
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

  return (
    <div className="flex flex-col h-full bg-white/20 dark:bg-gray-900/20 backdrop-blur-md">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/30 dark:border-gray-700/30 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          项目实施计划
        </span>
        <button
          onClick={fetchPlans}
          className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Create Plan Form */}
        <form onSubmit={handleCreatePlan} className="bg-white/40 dark:bg-gray-850/40 p-3 rounded-xl border border-white/50 dark:border-gray-700/30 space-y-2.5 shadow-sm">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">新建实施计划</div>
          <input
            type="text"
            placeholder="计划标题 (如: 独立 MCP 部署)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/40 dark:border-gray-650 bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
          />
          <input
            type="text"
            placeholder="计划描述..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/40 dark:border-gray-650 bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
          />
          <textarea
            placeholder="步骤列表 (每行写一个步骤)..."
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            rows={3}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/40 dark:border-gray-650 bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white resize-none"
          />
          <button
            type="submit"
            className="w-full py-1.5 text-xs font-medium rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white shadow-sm transition-all"
          >
            保存并生成计划
          </button>
        </form>

        {/* Plan List */}
        {loading && plans.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">加载中...</div>
        ) : plans.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">暂无活动计划</div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => {
              const progress = plan.totalSteps > 0 ? (plan.completedSteps / plan.totalSteps) * 100 : 0;
              const isExpanded = expandedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  className="bg-white/60 dark:bg-gray-850/60 border border-white/40 dark:border-gray-700/40 rounded-xl p-3 shadow-sm hover:bg-white/80 dark:hover:bg-gray-850/80 transition-all cursor-pointer"
                  onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {plan.title}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      plan.status === "completed"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : plan.status === "executing"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {plan.status === "completed" ? "已完成" : plan.status === "executing" ? "执行中" : "草稿"}
                    </span>
                  </div>

                  {plan.description && (
                    <div className="text-[10px] text-gray-400 mt-1 truncate">
                      {plan.description}
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="mt-2.5">
                    <div className="flex justify-between items-center text-[9px] text-gray-400 mb-1">
                      <span>进度: {plan.completedSteps}/{plan.totalSteps} 步骤</span>
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
                    <div className="mt-3 pt-3 border-t border-white/30 dark:border-gray-700/30 space-y-2" onClick={(e) => e.stopPropagation()}>
                      {plan.steps.map((step) => (
                        <div key={step.id} className="flex items-start justify-between text-[11px] py-1 border-b border-gray-50/20 dark:border-gray-800/10">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-medium text-gray-700 dark:text-gray-300 truncate">
                              {step.title}
                            </div>
                            {step.result && (
                              <div className="text-[9px] text-green-500 dark:text-green-400 mt-0.5 truncate">
                                {step.result}
                              </div>
                            )}
                            {step.error && (
                              <div className="text-[9px] text-red-500 dark:text-red-400 mt-0.5 truncate">
                                {step.error}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <select
                              value={step.status}
                              onChange={(e) => handleUpdateStep(plan.id, step.id, e.target.value)}
                              className="text-[9px] px-1 py-0.5 bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700/30 rounded focus:outline-none dark:text-white"
                            >
                              <option value="pending">待处理</option>
                              <option value="in_progress">进行中</option>
                              <option value="completed">已完成</option>
                              <option value="failed">已失败</option>
                              <option value="skipped">已跳过</option>
                            </select>
                          </div>
                        </div>
                      ))}
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
