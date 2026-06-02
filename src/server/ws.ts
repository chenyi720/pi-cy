import { WebSocketServer, type WebSocket } from "ws";
import { spawn } from "node:child_process";
import type http from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { RpcStartOptions } from "./types.js";
import { startPi, piSend, killPi, isAlive } from "./rpc.js";
import { analyzeImage } from "./api/vision.js";
import { generateImage, isComfyUIAvailable } from "./api/comfyui.js";
import { safePath, getProjectDir } from "./security.js";

const clients = new Set<WebSocket>();
let activeCmdProc: ReturnType<typeof spawn> | null = null;

function broadcast(msg: Record<string, unknown>): void {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    try {
      ws.send(data);
    } catch { /* client disconnected */ }
  }
}

export function getBroadcast() {
  return broadcast;
}

const IMAGE_GEN_KEYWORDS =
  /画[一-龥]|生成[图影像]|生图|创作|绘制|画一[张个只]|generate\s*(?:an?\s*)?image|draw\s|create\s*(?:an?\s*)?(?:image|picture)|make\s*(?:an?\s*)?(?:image|picture)/i;

function isImageGenIntent(text: string): boolean {
  return IMAGE_GEN_KEYWORDS.test(text);
}

async function handleChatMessage(
  text: string,
  imageBase64?: string,
  mimeType?: string,
): Promise<void> {
  if (imageBase64 && mimeType) {
    await analyzeImage(imageBase64, mimeType, text, broadcast);
    return;
  }

  if (isImageGenIntent(text)) {
    const available = await isComfyUIAvailable();
    if (!available) {
      broadcast({ type: "message_start" });
      broadcast({
        type: "message_update",
        delta: [
          {
            type: "text",
            text: "[ComfyUI 未启动] 请先运行 ComfyUI (http://127.0.0.1:8188) 后重试。当前可用模型：\n- mimo-v2.5-pro（文本对话）\n- mimo-v2.5（识图）\n- ComfyUI + HiDream O1（生图，需要启动 ComfyUI）",
          },
        ],
      });
      broadcast({ type: "message_end", usage: { input_tokens: 0, output_tokens: 0 } });
      return;
    }

    broadcast({ type: "message_start" });
    broadcast({
      type: "message_update",
      delta: [{ type: "text", text: "正在生成图片，请稍候（约 1-2 分钟）...\n" }],
    });

    try {
      const result = await generateImage(text);
      broadcast({
        type: "message_update",
        delta: [
          {
            type: "text",
            text: `图片生成完成！\n- 路径: ${result.imagePath}\n- Seed: ${result.seed}\n- 预览: /api/comfyui/image?path=${encodeURIComponent(result.imagePath)}`,
          },
        ],
      });
      broadcast({
        type: "image_generated",
        imagePath: result.imagePath,
        seed: result.seed,
      });
    } catch (e) {
      broadcast({
        type: "message_update",
        delta: [{ type: "text", text: `图片生成失败: ${(e as Error).message}` }],
      });
    }

    broadcast({ type: "message_end", usage: { input_tokens: 0, output_tokens: 0 } });
    return;
  }
  // Parse @file references and inject their contents
  let enrichedText = text;
  const fileMentions = text.match(/@([^\s\n\/\\][^\s\n]*)/g);
  if (fileMentions) {
    let contextBlocks = "";
    const projectDir = getProjectDir() || process.cwd();
    const safeProjectDir = safePath(projectDir);

    if (safeProjectDir) {
      for (const mention of fileMentions) {
        const relativePath = mention.slice(1); // strip '@'
        const fullPath = path.resolve(safeProjectDir, relativePath);
        const validatedPath = safePath(fullPath);

        // Security check: ensure path is under the project workspace directory
        if (
          validatedPath &&
          validatedPath.startsWith(safeProjectDir) &&
          fs.existsSync(validatedPath) &&
          fs.statSync(validatedPath).isFile()
        ) {
          try {
            // Check size limits (max 100KB) to prevent context token overflow
            const size = fs.statSync(validatedPath).size;
            if (size > 100 * 1024) {
              contextBlocks += `\n\n--- [File Context: ${relativePath} (Omitted - file exceeds 100KB)] ---\n`;
              continue;
            }

            // Exclude common binary files if user accidentally typed them
            const ext = path.extname(validatedPath).toLowerCase();
            const binaryExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip", ".tar", ".gz", ".exe", ".dll", ".so", ".dylib", ".pdf", ".mp4", ".mp3", ".wav"]);
            if (binaryExtensions.has(ext)) {
              contextBlocks += `\n\n--- [File Context: ${relativePath} (Omitted - binary file type)] ---\n`;
              continue;
            }

            const content = fs.readFileSync(validatedPath, "utf-8");
            contextBlocks += `\n\n--- [File Context: ${relativePath}] ---\n\`\`\`\n${content}\n\`\`\`\n`;
          } catch { /* ignore */ }
        }
      }
    }

    if (contextBlocks) {
      enrichedText = text + contextBlocks;
    }
  }

  broadcast({ type: "message_start" });
  piSend({ type: "user_input", text: enrichedText });
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
          opts?: RpcStartOptions;
          cwd?: string;
          cmdStr?: string;
          text?: string;
          image?: string;
          mimeType?: string;
        };

        switch (msg.type) {
          case "pi":
            piSend(msg.cmd);
            break;
          case "chat":
            handleChatMessage(msg.text || "", msg.image, msg.mimeType);
            break;
          case "start":
            startPi(msg.opts ?? {});
            break;
          case "kill":
            killPi();
            break;
          case "run_command": {
            if (activeCmdProc) {
              try { activeCmdProc.kill(); } catch { /* already dead */ }
              activeCmdProc = null;
            }
            const targetCwd = msg.cwd || process.cwd();
            activeCmdProc = spawn(msg.cmdStr ?? "", { shell: true, cwd: targetCwd });
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
              try { activeCmdProc.kill(); } catch { /* already dead */ }
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
