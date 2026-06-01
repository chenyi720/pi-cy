export type AgentStatus = "idle" | "running" | "completed" | "failed";

export interface AgentDefinition {
  name: string;
  description: string;
  systemPrompt?: string;
  tools?: string[];
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
}

export interface SwarmAgentStep {
  agentName: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
  result?: string;
  error?: string;
}

export interface SwarmInstance {
  id: string;
  template: string;
  task: string;
  status: "idle" | "running" | "completed" | "failed";
  steps: SwarmAgentStep[];
  createdAt: number;
  updatedAt: number;
}
