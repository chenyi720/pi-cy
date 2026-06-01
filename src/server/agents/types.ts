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
  result?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}
