export type AgentStatus = "idle" | "running" | "completed" | "failed" | "waiting";

export interface AgentDefinition {
  name: string;
  description: string;
  systemPrompt?: string;
  tools?: string[];
  color?: string;
  icon?: string;
  model?: string;
}

export interface AgentInstance {
  id: string;
  definition: string;
  status: AgentStatus;
  task: string;
  output?: string;
  result?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  parentId?: string;
  childIds?: string[];
}

export interface SwarmAgentStep {
  agentName: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
  result?: string;
  error?: string;
  parallelGroup?: number;
}

export interface SwarmInstance {
  id: string;
  template: string;
  task: string;
  status: "idle" | "running" | "completed" | "failed";
  steps: SwarmAgentStep[];
  createdAt: number;
  updatedAt: number;
  context?: Record<string, unknown>;
}

export interface AgentMessage {
  from: string;
  to: string;
  content: string;
  timestamp: number;
  type: "task" | "result" | "feedback" | "question";
}
