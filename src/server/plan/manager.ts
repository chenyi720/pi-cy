import { spawn } from "node:child_process";
import { getBroadcast } from "../ws.js";
import type { Plan, PlanStep, PlanStepStatus, PlanStatus } from "./types.js";

const plans = new Map<string, Plan>();

function nextId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPlan(
  title: string,
  description: string,
  inputSteps: Array<string | { title: string; description?: string; command?: string; dependencies?: Array<string | number> }>
): Plan {
  const id = nextId();
  const steps: PlanStep[] = inputSteps.map((step, i) => {
    if (typeof step === "string") {
      return {
        id: `${id}-step-${i}`,
        title: step,
        description: "",
        status: "pending" as PlanStepStatus,
      };
    } else {
      const deps = step.dependencies?.map((dep) => {
        if (typeof dep === "number" || /^\d+$/.test(String(dep))) {
          return `${id}-step-${dep}`;
        }
        return String(dep);
      }) || [];

      return {
        id: `${id}-step-${i}`,
        title: step.title,
        description: step.description || "",
        status: "pending" as PlanStepStatus,
        dependencies: deps,
        command: step.command,
      };
    }
  });

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
  getBroadcast()({ type: "plan_update", planId: id, plan });
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
    getBroadcast()({ type: "plan_update", planId: id, plan });
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

  getBroadcast()({ type: "plan_update", planId, plan });
}

export async function runStep(planId: string, stepId: string): Promise<void> {
  const plan = plans.get(planId);
  if (!plan) return;
  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) return;

  if (!step.command) {
    updateStepStatus(planId, stepId, "completed", "执行成功 (无命令)");
    return;
  }

  updateStepStatus(planId, stepId, "in_progress");

  const cmd = step.command;
  const proc = spawn(cmd, { shell: true, cwd: process.cwd() });

  let stdout = "";
  let stderr = "";

  proc.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  proc.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  return new Promise<void>((resolve) => {
    proc.on("close", (code) => {
      if (code === 0) {
        updateStepStatus(planId, stepId, "completed", stdout.trim() || "执行成功");
      } else {
        updateStepStatus(
          planId,
          stepId,
          "failed",
          undefined,
          stderr.trim() || stdout.trim() || `退出的状态码: ${code}`
        );
      }
      resolve();
    });
    proc.on("error", (err) => {
      updateStepStatus(planId, stepId, "failed", undefined, err.message);
      resolve();
    });
  });
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
  const ok = plans.delete(id);
  if (ok) {
    getBroadcast()({ type: "plan_deleted", planId: id });
  }
  return ok;
}
