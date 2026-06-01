export type ToolCategory = "read" | "write" | "execute" | "search" | "web";

export type PermissionLevel = "auto" | "confirm" | "deny";

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  permission: PermissionLevel;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    default?: unknown;
  }>;
  execute: (params: Record<string, unknown>, cwd: string) => Promise<ToolResult>;
}

export interface ToolResult {
  output: string;
  error?: string;
  metadata?: Record<string, unknown>;
}
