export type PlanStepStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";
export type PlanStatus = "draft" | "executing" | "completed" | "failed";

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: PlanStepStatus;
  dependencies?: string[];
  result?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  updatedAt?: number;
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  status: PlanStatus;
  createdAt: number;
  updatedAt: number;
  completedSteps: number;
  totalSteps: number;
}
