import { spawn } from "node:child_process";
import type { AgentDefinition, AgentInstance } from "./types.js";

const definitions = new Map<string, AgentDefinition>();
const instances = new Map<string, AgentInstance>();

function nextId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function registerAgent(def: AgentDefinition): void {
  definitions.set(def.name, def);
}

export function getAgentDefinition(name: string): AgentDefinition | undefined {
  return definitions.get(name);
}

export function getAllAgentDefinitions(): AgentDefinition[] {
  return Array.from(definitions.values());
}

export function spawnAgent(
  definitionName: string,
  task: string,
): AgentInstance | null {
  const def = definitions.get(definitionName);
  if (!def) return null;

  const id = nextId();
  const instance: AgentInstance = {
    id,
    definition: definitionName,
    status: "running",
    task,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  instances.set(id, instance);
  runAgent(instance, def);
  return instance;
}

async function runAgent(instance: AgentInstance, def: AgentDefinition): Promise<void> {
  const args = [
    "--print",
    "--model", "mimo-v2.5-pro",
    "--provider", "xiaomi-token-plan-cn",
  ];

  if (def.systemPrompt) {
    args.push("--append-system-prompt", def.systemPrompt);
  }

  args.push(instance.task);

  return new Promise<void>((resolve) => {
    const proc = spawn("pi", args, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      instance.updatedAt = Date.now();
      if (code === 0) {
        instance.status = "completed";
        instance.result = stdout.trim();
      } else {
        instance.status = "failed";
        instance.error = stderr.trim() || `Exit code ${code}`;
      }
      resolve();
    });

    proc.on("error", (err) => {
      instance.status = "failed";
      instance.error = err.message;
      instance.updatedAt = Date.now();
      resolve();
    });
  });
}

export function getAgentInstance(id: string): AgentInstance | undefined {
  return instances.get(id);
}

export function getAllAgentInstances(): AgentInstance[] {
  return Array.from(instances.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteAgentInstance(id: string): boolean {
  return instances.delete(id);
}

registerAgent({
  name: "general",
  description: "通用 Agent，可执行任何任务",
  systemPrompt: "You are a helpful coding assistant. Complete the given task thoroughly.",
});

registerAgent({
  name: "reviewer",
  description: "代码审查 Agent",
  systemPrompt: "You are a code reviewer. Review the given code for bugs, security issues, and best practices. Provide specific, actionable feedback.",
});

registerAgent({
  name: "researcher",
  description: "研究 Agent，用于调研和分析",
  systemPrompt: "You are a researcher. Investigate the given topic thoroughly and provide a comprehensive analysis with evidence.",
});
