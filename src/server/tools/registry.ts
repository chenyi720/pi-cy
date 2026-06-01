import type { ToolDefinition } from "./types.js";

const tools = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition): void {
  tools.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return tools.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(tools.values());
}

export function getToolsByCategory(category: string): ToolDefinition[] {
  return Array.from(tools.values()).filter((t) => t.category === category);
}

export function getToolNames(): string[] {
  return Array.from(tools.keys());
}
