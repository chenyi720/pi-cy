import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setProjectDir } from "./security.js";
import type { RpcStartOptions } from "./types.js";

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

  console.log(`Spawning pi: cwd=${targetCwd} args=[${args.join(" ")}]`);
  piProc = spawn("pi", args, {
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
    cwd: targetCwd,
  });
  rpcBuf = "";

  piProc.stdout!.on("data", (chunk: Buffer) => {
    rpcBuf += chunk.toString();
    const lines = rpcBuf.split("\n");
    rpcBuf = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try {
        broadcastRef(JSON.parse(t));
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
