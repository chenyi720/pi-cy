export interface ToolSchema {
  name: string;
  description: string;
  category: string;
  permission: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    default?: unknown;
  }>;
}

export interface ToolResult {
  output: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export async function fetchTools(): Promise<ToolSchema[]> {
  const res = await fetch("/api/tools");
  return res.json();
}

export async function executeToolApi(
  tool: string,
  params: Record<string, unknown>,
  cwd?: string,
): Promise<ToolResult> {
  const res = await fetch("/api/tools/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, params, cwd }),
  });
  return res.json();
}
