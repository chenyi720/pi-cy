import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { registerTool } from "../tools/registry.js";
import type { ToolResult } from "../tools/types.js";
import { loadMcpConfig, type McpServerConfig } from "./config.js";

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  serverName: string;
}

const connectedClients = new Map<string, Client>();
const discoveredTools = new Map<string, McpTool>();
let mcpInitialized = false;

export function isMcpInitialized(): boolean {
  return mcpInitialized;
}

export function getDiscoveredMcpTools(): McpTool[] {
  return Array.from(discoveredTools.values());
}

export async function initMcp(): Promise<void> {
  const servers = loadMcpConfig();
  const entries = Object.entries(servers);

  if (entries.length === 0) {
    console.log("[MCP] No MCP servers configured");
    mcpInitialized = true;
    return;
  }

  console.log(`[MCP] Found ${entries.length} server(s): ${entries.map(([n]) => n).join(", ")}`);

  for (const [name, config] of entries) {
    try {
      await connectServer(name, config);
    } catch (e) {
      console.error(`[MCP] Failed to connect to ${name}: ${(e as Error).message}`);
    }
  }

  mcpInitialized = true;
  console.log(`[MCP] Discovered ${discoveredTools.size} tool(s) from ${connectedClients.size} server(s)`);
}

async function connectServer(name: string, config: McpServerConfig): Promise<void> {
  const client = new Client(
    {
      name: "pi-cy-client",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  );

  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args || [],
    env: { ...process.env, ...config.env } as Record<string, string>,
  });

  await client.connect(transport);
  connectedClients.set(name, client);

  console.log(`[MCP] Connected to server ${name}, requesting tools list...`);
  const response = await client.listTools();
  
  const tools = response.tools || [];
  for (const tool of tools) {
    const fullName = `mcp_${name}_${tool.name}`;
    discoveredTools.set(fullName, {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown>,
      serverName: name,
    });

    registerTool({
      name: fullName,
      description: `[MCP:${name}] ${tool.description || tool.name}`,
      category: "execute",
      permission: "confirm",
      parameters: (tool.inputSchema?.properties || {}) as Record<string, {
        type: string;
        description: string;
        required?: boolean;
      }>,
      execute: async (params): Promise<ToolResult> => {
        return callMcpTool(name, tool.name, params);
      },
    });
  }
}

async function callMcpTool(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const client = connectedClients.get(serverName);
  if (!client) {
    return { output: "", error: `MCP client for ${serverName} not connected` };
  }

  try {
    const response = await client.callTool({
      name: toolName,
      arguments: args,
    });

    const content = (response.content || []) as any[];

    if (response.isError) {
      const errText = content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n");
      return { output: "", error: errText || "MCP error during call" };
    }

    const text = content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");
    return { output: text };
  } catch (e) {
    return { output: "", error: (e as Error).message };
  }
}

export function shutdownMcp(): void {
  for (const [name, client] of connectedClients) {
    try {
      client.close().catch(() => {});
      console.log(`[MCP] Closed client connection to ${name}`);
    } catch { /* ignore */ }
  }
  connectedClients.clear();
  discoveredTools.clear();
}
