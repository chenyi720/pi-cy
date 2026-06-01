export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type TaskSchedule = "once" | "cron";

export interface Task {
  id: string;
  name: string;
  command: string;
  status: TaskStatus;
  schedule: TaskSchedule;
  cronExpression?: string;
  result?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
  nextRunAt?: number;
}
