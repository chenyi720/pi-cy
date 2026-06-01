import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setProjectDir } from "./security.js";
import type { RpcStartOptions } from "./types.js";
import { getToolSchemas } from "./tools/index.js";
import { executeTool } from "./tools/executor.js";

let piProc: ChildProcess | null = null;
let rpcBuf = "";

type BroadcastFn = (msg: Record<string, unknown>) => void;

let broadcastRef: BroadcastFn = () => {};

export function setBroadcast(fn: BroadcastFn): void {
  broadcastRef = fn;
}

export function isAlive(): boolean {
  return !!piProc;
}

export function startPi(opts: RpcStartOptions = {}): void {
  if (piProc) killPi();

  const args = ["--mode", "rpc"];
  if (opts.provider) args.push("--provider", opts.provider);
  if (opts.model) args.push("--model", opts.model);
  if (opts.thinking && opts.thinking !== "off")
    args.push("--thinking", opts.thinking);
  if (opts.session) args.push("--session", opts.session);
  if (opts.systemPrompt?.trim())
    args.push("--append-system-prompt", opts.systemPrompt.trim());

  const targetCwd = opts.cwd || process.cwd();
  setProjectDir(targetCwd);

  // Load workspace custom rules
  try {
    for (const name of [".roorules", ".pi-rules"]) {
      const rulesPath = path.join(targetCwd, name);
      if (fs.existsSync(rulesPath)) {
        const content = fs.readFileSync(rulesPath, "utf-8").trim();
        if (content) {
          args.push("--append-system-prompt", content);
          console.log(`Loaded rules from ${name} (${content.length} chars)`);
          break;
        }
      }
    }
  } catch (err) {
    console.error(`Error reading custom rules: ${(err as Error).message}`);
  }

  // Inject PI-CY tool schemas into system prompt
  const toolSchemas = getToolSchemas();
  if (toolSchemas.length > 0) {
    const toolPrompt = [
      "## PI-CY Extended Tools",
      "You have access to additional tools via the PI-CY platform. When you need to use these tools, output a JSON block in this exact format:",
      '```tool_call',
      '{"name": "tool_name", "arguments": {"param": "value"}}',
      "```",
      "",
      "Available tools:",
      ...toolSchemas.map((t) => `- **${t.name}**: ${t.description}`),
      "",
      "The PI-CY system will intercept these tool calls and execute them for you. Wait for the tool result before continuing.",
    ].join("\n");
    args.push("--append-system-prompt", toolPrompt);
  }

  console.log(`Spawning pi: cwd=${targetCwd} args=[${args.join(" ")}]`);
  piProc = spawn("pi", args, {
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
    cwd: targetCwd,
  });
  rpcBuf = "";

  async function handleToolCall(jsonStr: string): Promise<void> {
    try {
      const call = JSON.parse(jsonStr);
      const toolName = call.name as string;
      const toolArgs = (call.arguments || {}) as Record<string, unknown>;

      broadcastRef({
        type: "tool_execution_start",
        tool_call_id: `tool-${Date.now()}`,
        tool_name: toolName,
        tool_arguments: toolArgs,
      });

      const result = await executeTool(toolName, toolArgs, targetCwd);

      broadcastRef({
        type: "tool_execution_end",
        tool_call_id: `tool-${Date.now()}`,
        result: result.output || result.error || "",
        status: result.error ? "error" : "success",
      });

      // Send tool result back to pi
      const resultMsg = `[Tool Result: ${toolName}]\n${result.output || result.error || "No output"}`;
      piSend({ type: "user_input", text: resultMsg });
    } catch (e) {
      console.error("Tool call error:", (e as Error).message);
    }
  }

  piProc.stdout!.on("data", (chunk: Buffer) => {
    rpcBuf += chunk.toString();
    const lines = rpcBuf.split("\n");
    rpcBuf = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try {
        const parsed = JSON.parse(t);
        broadcastRef(parsed);

        // Intercept tool_call blocks in message_update
        if (parsed.type === "message_update" && parsed.delta) {
          for (const d of parsed.delta) {
            if (d.type === "text" && d.text) {
              const toolMatch = d.text.match(/```tool_call\s*\n(\{[\s\S]*?\})\s*\n```/);
              if (toolMatch) {
                handleToolCall(toolMatch[1]);
              }
            }
          }
        }
      } catch {
        console.error("Failed to parse pi stdout:", t.slice(0, 200));
      }
    }
  });

  piProc.stderr!.on("data", (chunk: Buffer) => {
    const msg = chunk.toString().trim();
    console.error(`pi stderr: ${msg}`);
    broadcastRef({ type: "stderr", msg });
  });

  piProc.on("exit", (code) => {
    console.log(`pi exited with code: ${code}`);
    piProc = null;
    broadcastRef({ type: "exit", code });
  });

  piProc.on("error", (err) => {
    console.error(`pi spawn error: ${err.message}`);
    piProc = null;
    broadcastRef({ type: "error", msg: err.message });
  });
}

export function piSend(cmd: unknown): boolean {
  if (!piProc || !piProc.stdin?.writable) return false;
  try {
    piProc.stdin.write(JSON.stringify(cmd) + "\n");
    return true;
  } catch {
    return false;
  }
}

export function killPi(): void {
  if (piProc) {
    try {
      piProc.kill();
    } catch { /* already dead */ }
    piProc = null;
  }
}
