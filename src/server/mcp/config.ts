import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

export function loadMcpConfig(): Record<string, McpServerConfig> {
  const configPaths = [
    path.join(process.cwd(), ".mcp.json"),
    path.join(os.homedir(), ".pi", "agent", "mcp.json"),
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const servers: Record<string, McpServerConfig> = {};
        for (const [name, config] of Object.entries(raw.mcpServers || raw)) {
          const cfg = config as McpServerConfig;
          if (!cfg.disabled) {
            servers[name] = cfg;
          }
        }
        return servers;
      }
    } catch { /* ignore */ }
  }

  return {};
}

export function saveMcpConfig(servers: Record<string, McpServerConfig>): void {
  const configPath = path.join(process.cwd(), ".mcp.json");
  const raw = { mcpServers: servers };
  fs.writeFileSync(configPath, JSON.stringify(raw, null, 2), "utf-8");
}
