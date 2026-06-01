import { spawn } from "node:child_process";
import { getBroadcast } from "../ws.js";
import type { AgentDefinition, AgentInstance, SwarmInstance, SwarmAgentStep } from "./types.js";

const definitions = new Map<string, AgentDefinition>();
const instances = new Map<string, AgentInstance>();
const swarms = new Map<string, SwarmInstance>();

function nextId(prefix = "agent"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
      instance.output = stdout.trim();
      instance.updatedAt = Date.now();
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

// --- Swarm Orchestration Engine ---

export function getAllSwarmInstances(): SwarmInstance[] {
  return Array.from(swarms.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function spawnSwarm(template: string, task: string): SwarmInstance | null {
  const id = nextId("swarm");
  let steps: SwarmAgentStep[] = [];

  if (template === "coder-reviewer") {
    steps = [
      { agentName: "general", status: "pending" },
      { agentName: "reviewer", status: "pending" },
    ];
  } else if (template === "research-analyst") {
    steps = [
      { agentName: "researcher", status: "pending" },
      { agentName: "general", status: "pending" },
    ];
  } else {
    // Fallback simple sequential swarm
    steps = [
      { agentName: "general", status: "pending" },
    ];
  }

  const swarm: SwarmInstance = {
    id,
    template,
    task,
    status: "idle",
    steps,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  swarms.set(id, swarm);
  getBroadcast()({ type: "swarm_update", swarmId: id, swarm });
  
  // Kickstart execution
  runSwarmStep(id, 0).catch(console.error);

  return swarm;
}

async function runSwarmStep(swarmId: string, stepIndex: number): Promise<void> {
  const swarm = swarms.get(swarmId);
  if (!swarm) return;

  const step = swarm.steps[stepIndex];
  if (!step) {
    swarm.status = "completed";
    swarm.updatedAt = Date.now();
    getBroadcast()({ type: "swarm_update", swarmId, swarm });
    return;
  }

  step.status = "running";
  swarm.status = "running";
  swarm.updatedAt = Date.now();
  getBroadcast()({ type: "swarm_update", swarmId, swarm });

  let stepTask = swarm.task;
  if (stepIndex > 0) {
    const prevStep = swarm.steps[stepIndex - 1];
    stepTask = `Based on the original task requirements: "${swarm.task}" and the work done by the previous agent:\n\n[Previous Agent's Output]\n${prevStep.result || ""}\n\nPlease perform your task (e.g. review, analyze, or refine).`;
  }

  const def = definitions.get(step.agentName);
  if (!def) {
    step.status = "failed";
    step.error = `Agent definition for ${step.agentName} not found`;
    swarm.status = "failed";
    swarm.updatedAt = Date.now();
    getBroadcast()({ type: "swarm_update", swarmId, swarm });
    return;
  }

  const args = [
    "--print",
    "--model", "mimo-v2.5-pro",
    "--provider", "xiaomi-token-plan-cn",
  ];
  if (def.systemPrompt) {
    args.push("--append-system-prompt", def.systemPrompt);
  }
  args.push(stepTask);

  const proc = spawn("pi", args, {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  proc.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
    step.output = stdout.trim();
    swarm.updatedAt = Date.now();
    getBroadcast()({ type: "swarm_update", swarmId, swarm });
  });

  proc.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  proc.on("close", (code) => {
    swarm.updatedAt = Date.now();
    if (code === 0) {
      step.status = "completed";
      step.result = stdout.trim();
      getBroadcast()({ type: "swarm_update", swarmId, swarm });
      runSwarmStep(swarmId, stepIndex + 1).catch(console.error);
    } else {
      step.status = "failed";
      step.error = stderr.trim() || `Exit code ${code}`;
      swarm.status = "failed";
      getBroadcast()({ type: "swarm_update", swarmId, swarm });
    }
  });

  proc.on("error", (err) => {
    step.status = "failed";
    step.error = err.message;
    swarm.status = "failed";
    swarm.updatedAt = Date.now();
    getBroadcast()({ type: "swarm_update", swarmId, swarm });
  });
}

// --- Default agent registers ---

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
