import { spawn } from "node:child_process";
import { getBroadcast } from "../ws.js";
import type { AgentDefinition, AgentInstance, SwarmInstance, SwarmAgentStep, AgentMessage } from "./types.js";

const definitions = new Map<string, AgentDefinition>();
const instances = new Map<string, AgentInstance>();
const swarms = new Map<string, SwarmInstance>();
const messageLog: AgentMessage[] = [];

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
  parentId?: string,
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
    parentId,
  };

  instances.set(id, instance);

  if (parentId) {
    const parent = instances.get(parentId);
    if (parent) {
      parent.childIds = parent.childIds || [];
      parent.childIds.push(id);
    }
  }

  getBroadcast()({ type: "agent_update", agentId: id, agent: instance });
  runAgent(instance, def);
  return instance;
}

async function runAgent(instance: AgentInstance, def: AgentDefinition): Promise<void> {
  const args = [
    "--print",
    "--model", def.model || "mimo-v2.5-pro",
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
      getBroadcast()({ type: "agent_update", agentId: instance.id, agent: instance });
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
      getBroadcast()({ type: "agent_update", agentId: instance.id, agent: instance });
      resolve();
    });

    proc.on("error", (err) => {
      instance.status = "failed";
      instance.error = err.message;
      instance.updatedAt = Date.now();
      getBroadcast()({ type: "agent_update", agentId: instance.id, agent: instance });
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

export function sendAgentMessage(msg: AgentMessage): void {
  messageLog.push(msg);
  getBroadcast()({ type: "agent_message", message: msg });
}

export function getAgentMessages(agentId?: string): AgentMessage[] {
  if (agentId) {
    return messageLog.filter((m) => m.from === agentId || m.to === agentId);
  }
  return [...messageLog];
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
      { agentName: "coder", status: "pending", parallelGroup: 0 },
      { agentName: "reviewer", status: "pending", parallelGroup: 1 },
    ];
  } else if (template === "research-analyst") {
    steps = [
      { agentName: "researcher", status: "pending", parallelGroup: 0 },
      { agentName: "analyst", status: "pending", parallelGroup: 1 },
    ];
  } else if (template === "full-pipeline") {
    steps = [
      { agentName: "architect", status: "pending", parallelGroup: 0 },
      { agentName: "coder", status: "pending", parallelGroup: 1 },
      { agentName: "reviewer", status: "pending", parallelGroup: 2 },
      { agentName: "tester", status: "pending", parallelGroup: 3 },
    ];
  } else if (template === "parallel-research") {
    steps = [
      { agentName: "researcher", status: "pending", parallelGroup: 0 },
      { agentName: "researcher", status: "pending", parallelGroup: 0 },
      { agentName: "analyst", status: "pending", parallelGroup: 1 },
    ];
  } else {
    steps = [
      { agentName: "general", status: "pending", parallelGroup: 0 },
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

  runSwarmParallelGroup(id, 0).catch(console.error);

  return swarm;
}

async function runSwarmParallelGroup(swarmId: string, groupIndex: number): Promise<void> {
  const swarm = swarms.get(swarmId);
  if (!swarm) return;

  const groupSteps = swarm.steps
    .map((step, idx) => ({ step, idx }))
    .filter(({ step }) => (step.parallelGroup ?? 0) === groupIndex);

  if (groupSteps.length === 0) {
    swarm.status = "completed";
    swarm.updatedAt = Date.now();
    getBroadcast()({ type: "swarm_update", swarmId, swarm });
    return;
  }

  swarm.status = "running";
  swarm.updatedAt = Date.now();
  getBroadcast()({ type: "swarm_update", swarmId, swarm });

  const prevResults = swarm.steps
    .filter((s) => s.status === "completed")
    .map((s) => `[${s.agentName}]: ${s.result || s.output || ""}`)
    .join("\n\n");

  const promises = groupSteps.map(({ step, idx }) => {
    step.status = "running";
    getBroadcast()({ type: "swarm_update", swarmId, swarm });

    let stepTask = swarm.task;
    if (prevResults) {
      stepTask = `Original task: "${swarm.task}"\n\nPrevious agent outputs:\n${prevResults}\n\nPerform your role.`;
    }

    const def = definitions.get(step.agentName);
    if (!def) {
      step.status = "failed";
      step.error = `Agent definition for ${step.agentName} not found`;
      return Promise.resolve();
    }

    return runSwarmAgent(swarmId, idx, def, stepTask);
  });

  await Promise.all(promises);

  const allCompleted = groupSteps.every(({ step }) => step.status === "completed");
  if (allCompleted) {
    runSwarmParallelGroup(swarmId, groupIndex + 1).catch(console.error);
  } else {
    swarm.status = "failed";
    swarm.updatedAt = Date.now();
    getBroadcast()({ type: "swarm_update", swarmId, swarm });
  }
}

function runSwarmAgent(
  swarmId: string,
  stepIndex: number,
  def: AgentDefinition,
  task: string,
): Promise<void> {
  const swarm = swarms.get(swarmId);
  if (!swarm) return Promise.resolve();

  const step = swarm.steps[stepIndex];
  if (!step) return Promise.resolve();

  const args = [
    "--print",
    "--model", def.model || "mimo-v2.5-pro",
    "--provider", "xiaomi-token-plan-cn",
  ];
  if (def.systemPrompt) {
    args.push("--append-system-prompt", def.systemPrompt);
  }
  args.push(task);

  return new Promise<void>((resolve) => {
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
      } else {
        step.status = "failed";
        step.error = stderr.trim() || `Exit code ${code}`;
      }
      getBroadcast()({ type: "swarm_update", swarmId, swarm });
      resolve();
    });

    proc.on("error", (err) => {
      step.status = "failed";
      step.error = err.message;
      swarm.status = "failed";
      swarm.updatedAt = Date.now();
      getBroadcast()({ type: "swarm_update", swarmId, swarm });
      resolve();
    });
  });
}

// --- Default agent registers ---

registerAgent({
  name: "general",
  description: "通用 Agent，可执行任何任务",
  systemPrompt: "You are a helpful coding assistant. Complete the given task thoroughly.",
  color: "#3b82f6",
  icon: "🤖",
});

registerAgent({
  name: "coder",
  description: "代码编写 Agent，专注于实现功能",
  systemPrompt: "You are a senior software engineer. Write clean, well-structured, production-ready code. Follow best practices and coding standards. Always include error handling.",
  color: "#10b981",
  icon: "💻",
});

registerAgent({
  name: "reviewer",
  description: "代码审查 Agent，检查代码质量",
  systemPrompt: "You are a code reviewer. Review the given code for bugs, security issues, performance problems, and best practices. Provide specific, actionable feedback with line references.",
  color: "#f59e0b",
  icon: "🔍",
});

registerAgent({
  name: "researcher",
  description: "研究 Agent，用于调研和分析",
  systemPrompt: "You are a researcher. Investigate the given topic thoroughly and provide a comprehensive analysis with evidence. Use web search when needed.",
  color: "#8b5cf6",
  icon: "📚",
});

registerAgent({
  name: "architect",
  description: "架构设计 Agent，设计系统架构",
  systemPrompt: "You are a software architect. Design system architecture, define module boundaries, specify interfaces, and create technical design documents. Consider scalability, maintainability, and performance.",
  color: "#ec4899",
  icon: "🏗️",
});

registerAgent({
  name: "tester",
  description: "测试 Agent，编写和运行测试",
  systemPrompt: "You are a QA engineer. Write comprehensive tests (unit, integration, e2e). Find bugs, verify fixes, and ensure code quality. Use appropriate testing frameworks.",
  color: "#06b6d4",
  icon: "🧪",
});

registerAgent({
  name: "debugger",
  description: "调试 Agent，定位和修复 bug",
  systemPrompt: "You are a debugger. Systematically investigate issues, trace execution flow, identify root causes, and propose minimal fixes. Always verify your fix works.",
  color: "#ef4444",
  icon: "🐛",
});

registerAgent({
  name: "analyst",
  description: "分析 Agent，数据分析和报告",
  systemPrompt: "You are a data analyst. Analyze the given data, identify patterns, create summaries, and provide actionable insights. Use charts and tables when appropriate.",
  color: "#14b8a6",
  icon: "📊",
});
