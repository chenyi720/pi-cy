import { execSync } from "node:child_process";
import { registerTool } from "./registry.js";

registerTool({
  name: "bash",
  description: "Execute a shell command and return stdout/stderr",
  category: "execute",
  permission: "confirm",
  parameters: {
    command: { type: "string", description: "Shell command to execute", required: true },
  },
  async execute(params, cwd) {
    const cmd = params.command as string;
    try {
      const output = execSync(cmd, {
        cwd,
        encoding: "utf-8",
        timeout: 30000,
        windowsHide: true,
        shell: true,
        maxBuffer: 1024 * 1024,
      });
      return { output: output.trim() };
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      return {
        output: (err.stdout || "").trim(),
        error: (err.stderr || err.message || "").trim(),
      };
    }
  },
});

registerTool({
  name: "powershell",
  description: "Execute a PowerShell command (Windows)",
  category: "execute",
  permission: "confirm",
  parameters: {
    command: { type: "string", description: "PowerShell command to execute", required: true },
  },
  async execute(params, cwd) {
    const cmd = params.command as string;
    try {
      const output = execSync(`powershell -NoProfile -Command "${cmd.replace(/"/g, '\\"')}"`, {
        cwd,
        encoding: "utf-8",
        timeout: 30000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });
      return { output: output.trim() };
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      return {
        output: (err.stdout || "").trim(),
        error: (err.stderr || err.message || "").trim(),
      };
    }
  },
});
