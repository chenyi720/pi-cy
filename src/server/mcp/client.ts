import { spawn, type ChildProcess } from "node:child_process";
import { registerTool } from "../tools/registry.js";
import type { ToolResult } from "../tools/types.js";
import { loadMcpConfig, type McpServerConfig } from "./config.js";

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  serverName: string;
}

const connectedServers = new Map<string, ChildProcess>();
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
  console.log(`[MCP] Discovered ${discoveredTools.size} tool(s) from ${connectedServers.size} server(s)`);
}

async function connectServer(name: string, config: McpServerConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = config.args || [];
    const proc = spawn(config.command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      env: { ...process.env, ...config.env },
    });

    connectedServers.set(name, proc);

    let stdout = "";

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      const lines = stdout.split("\n");
      stdout = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const msg = JSON.parse(trimmed);
          handleMcpMessage(name, msg);
        } catch { /* ignore non-JSON */ }
      }
    });

    proc.stderr?.on("data", () => {
      // stderr output from MCP server (ignored)
    });

    proc.on("error", (err) => {
      console.error(`[MCP] ${name} error: ${err.message}`);
      connectedServers.delete(name);
      reject(err);
    });

    proc.on("exit", (code) => {
      console.log(`[MCP] ${name} exited with code ${code}`);
      connectedServers.delete(name);
    });

    const initMsg = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        clientInfo: { name: "pi-cy", version: "0.1.0" },
      },
    };

    proc.stdin?.write(JSON.stringify(initMsg) + "\n");

    setTimeout(() => {
      const listMsg = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      };
      proc.stdin?.write(JSON.stringify(listMsg) + "\n");
      resolve();
    }, 1000);
  });
}

function handleMcpMessage(serverName: string, msg: Record<string, unknown>): void {
  if (msg.method === "tools/list" || (msg.result && (msg.result as Record<string, unknown>).tools)) {
    const tools = ((msg.result as Record<string, unknown>)?.tools || []) as Array<{
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
    }>;

    for (const tool of tools) {
      const fullName = `mcp_${serverName}_${tool.name}`;
      discoveredTools.set(fullName, {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        serverName,
      });

      registerTool({
        name: fullName,
        description: `[MCP:${serverName}] ${tool.description || tool.name}`,
        category: "execute",
        permission: "confirm",
        parameters: (tool.inputSchema?.properties || {}) as Record<string, {
          type: string;
          description: string;
          required?: boolean;
        }>,
        execute: async (params): Promise<ToolResult> => {
          return callMcpTool(serverName, tool.name, params);
        },
      });
    }
  }
}

async function callMcpTool(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const proc = connectedServers.get(serverName);
  if (!proc || !proc.stdin?.writable) {
    return { output: "", error: `MCP server ${serverName} not connected` };
  }

  return new Promise((resolve) => {
    const id = Date.now();
    const msg = {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    };

    let responseBuffer = "";

    const handler = (chunk: Buffer) => {
      responseBuffer += chunk.toString();
      const lines = responseBuffer.split("\n");
      responseBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const resp = JSON.parse(trimmed);
          if (resp.id === id) {
            proc.stdout?.off("data", handler);
            if (resp.error) {
              resolve({ output: "", error: resp.error.message || "MCP error" });
            } else {
              const content = resp.result?.content;
              if (Array.isArray(content)) {
                const text = content
                  .filter((c: { type: string }) => c.type === "text")
                  .map((c: { text: string }) => c.text)
                  .join("\n");
                resolve({ output: text });
              } else {
                resolve({ output: JSON.stringify(resp.result) });
              }
            }
            return;
          }
        } catch { /* ignore */ }
      }
    };

    proc.stdout?.on("data", handler);
    proc.stdin?.write(JSON.stringify(msg) + "\n");

    setTimeout(() => {
      proc.stdout?.off("data", handler);
      resolve({ output: "", error: "MCP call timeout" });
    }, 30000);
  });
}

export function shutdownMcp(): void {
  for (const [name, proc] of connectedServers) {
    try {
      proc.kill();
      console.log(`[MCP] Shut down ${name}`);
    } catch { /* ignore */ }
  }
  connectedServers.clear();
  discoveredTools.clear();
}
