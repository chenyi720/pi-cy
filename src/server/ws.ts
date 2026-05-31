import { WebSocketServer, type WebSocket } from "ws";
import type http from "node:http";
import { startPi, piSend, killPi, isAlive } from "./rpc.js";

const clients = new Set<WebSocket>();
let activeCmdProc: ReturnType<typeof import("node:child_process").spawn> | null = null;

function broadcast(msg: Record<string, unknown>): void {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    try {
      ws.send(data);
    } catch {}
  }
}

export function getBroadcast() {
  return broadcast;
}

export function setupWebSocket(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: "connected", alive: isAlive() }));
    ws.on("close", () => clients.delete(ws));
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as {
          type: string;
          cmd?: unknown;
          opts?: Record<string, unknown>;
          cwd?: string;
          cmdStr?: string;
        };

        switch (msg.type) {
          case "pi":
            piSend(msg.cmd);
            break;
          case "start":
            startPi(msg.opts as any);
            break;
          case "kill":
            killPi();
            break;
          case "run_command": {
            if (activeCmdProc) {
              try { activeCmdProc.kill(); } catch {}
              activeCmdProc = null;
            }
            const targetCwd = msg.cwd || process.cwd();
            const { spawn } = require("node:child_process");
            activeCmdProc = spawn(msg.cmdStr, { shell: true, cwd: targetCwd });
            activeCmdProc.stdout?.on("data", (chunk: Buffer) => {
              broadcast({ type: "cmd_out", msg: chunk.toString() });
            });
            activeCmdProc.stderr?.on("data", (chunk: Buffer) => {
              broadcast({ type: "cmd_out", msg: chunk.toString() });
            });
            activeCmdProc.on("exit", (code: number) => {
              activeCmdProc = null;
              broadcast({ type: "cmd_exit", code });
            });
            break;
          }
          case "kill_command": {
            if (activeCmdProc) {
              try { activeCmdProc.kill(); } catch {}
              activeCmdProc = null;
              broadcast({ type: "cmd_out", msg: "\n[Terminal] Command aborted.\n" });
              broadcast({ type: "cmd_exit", code: -1 });
            }
            break;
          }
        }
      } catch (e) {
        console.error("WebSocket message error:", (e as Error).message);
      }
    });
  });

  return wss;
}
