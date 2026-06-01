import type { Plan, PlanStep, PlanStepStatus, PlanStatus } from "./types.js";

const plans = new Map<string, Plan>();

function nextId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPlan(title: string, description: string, stepTitles: string[]): Plan {
  const id = nextId();
  const steps: PlanStep[] = stepTitles.map((title, i) => ({
    id: `${id}-step-${i}`,
    title,
    description: "",
    status: "pending" as PlanStepStatus,
  }));

  const plan: Plan = {
    id,
    title,
    description,
    steps,
    status: "draft",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedSteps: 0,
    totalSteps: steps.length,
  };

  plans.set(id, plan);
  return plan;
}

export function getPlan(id: string): Plan | undefined {
  return plans.get(id);
}

export function getAllPlans(): Plan[] {
  return Array.from(plans.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function updatePlanStatus(id: string, status: PlanStatus): void {
  const plan = plans.get(id);
  if (plan) {
    plan.status = status;
    plan.updatedAt = Date.now();
  }
}

export function updateStepStatus(
  planId: string,
  stepId: string,
  status: PlanStepStatus,
  result?: string,
  error?: string,
): void {
  const plan = plans.get(planId);
  if (!plan) return;

  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) return;

  step.status = status;
  step.updatedAt = Date.now();

  if (status === "in_progress") {
    step.startedAt = Date.now();
    plan.status = "executing";
  }

  if (status === "completed") {
    step.completedAt = Date.now();
    step.result = result;
  }

  if (status === "failed") {
    step.error = error;
  }

  plan.completedSteps = plan.steps.filter((s) => s.status === "completed").length;
  plan.updatedAt = Date.now();

  if (plan.completedSteps === plan.totalSteps) {
    plan.status = "completed";
  }

  if (status === "failed") {
    plan.status = "failed";
  }
}

export function getNextPendingStep(planId: string): PlanStep | undefined {
  const plan = plans.get(planId);
  if (!plan) return undefined;

  return plan.steps.find((step) => {
    if (step.status !== "pending") return false;
    if (!step.dependencies || step.dependencies.length === 0) return true;
    return step.dependencies.every((depId) => {
      const dep = plan.steps.find((s) => s.id === depId);
      return dep?.status === "completed";
    });
  });
}

export function deletePlan(id: string): boolean {
  return plans.delete(id);
}
