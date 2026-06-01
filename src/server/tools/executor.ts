import { getTool, getAllTools } from "./registry.js";
import type { ToolResult } from "./types.js";

export async function executeTool(
  name: string,
  params: Record<string, unknown>,
  cwd: string,
): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) {
    return { output: "", error: `Tool not found: ${name}` };
  }

  const missing = Object.entries(tool.parameters)
    .filter(([key, def]) => def.required && params[key] === undefined)
    .map(([key]) => key);

  if (missing.length > 0) {
    return { output: "", error: `Missing required parameters: ${missing.join(", ")}` };
  }

  const filled: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(tool.parameters)) {
    filled[key] = params[key] ?? def.default;
  }

  try {
    return await tool.execute(filled, cwd);
  } catch (e) {
    return { output: "", error: `Tool execution failed: ${(e as Error).message}` };
  }
}

export function getToolSchemas(): Array<{
  name: string;
  description: string;
  category: string;
  permission: string;
  parameters: Record<string, unknown>;
}> {
  return getAllTools().map((t) => ({
    name: t.name,
    description: t.description,
    category: t.category,
    permission: t.permission,
    parameters: t.parameters,
  }));
}
