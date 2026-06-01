import { spawn } from "node:child_process";
import type { Task, TaskStatus, TaskSchedule } from "./types.js";

const tasks = new Map<string, Task>();
const runningProcesses = new Map<string, ReturnType<typeof spawn>>();

function nextId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createTask(
  name: string,
  command: string,
  schedule: TaskSchedule = "once",
  cronExpression?: string,
): Task {
  const id = nextId();
  const task: Task = {
    id,
    name,
    command,
    status: "pending",
    schedule,
    cronExpression,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  tasks.set(id, task);
  return task;
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id);
}

export function getAllTasks(): Task[] {
  return Array.from(tasks.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function startTask(id: string): boolean {
  const task = tasks.get(id);
  if (!task || task.status === "running") return false;

  task.status = "running";
  task.updatedAt = Date.now();
  task.lastRunAt = Date.now();

  runTask(task);
  return true;
}

async function runTask(task: Task): Promise<void> {
  return new Promise<void>((resolve) => {
    const proc = spawn(task.command, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    runningProcesses.set(task.id, proc);

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      runningProcesses.delete(task.id);
      task.updatedAt = Date.now();

      if (code === 0) {
        task.status = "completed";
        task.result = stdout.trim();
      } else {
        task.status = "failed";
        task.error = stderr.trim() || `Exit code ${code}`;
      }

      resolve();
    });

    proc.on("error", (err) => {
      runningProcesses.delete(task.id);
      task.status = "failed";
      task.error = err.message;
      task.updatedAt = Date.now();
      resolve();
    });
  });
}

export function cancelTask(id: string): boolean {
  const task = tasks.get(id);
  if (!task) return false;

  const proc = runningProcesses.get(id);
  if (proc) {
    try { proc.kill(); } catch { /* ignore */ }
    runningProcesses.delete(id);
  }

  task.status = "cancelled";
  task.updatedAt = Date.now();
  return true;
}

export function deleteTask(id: string): boolean {
  cancelTask(id);
  return tasks.delete(id);
}

export function updateTaskStatus(id: string, status: TaskStatus): void {
  const task = tasks.get(id);
  if (task) {
    task.status = status;
    task.updatedAt = Date.now();
  }
}
