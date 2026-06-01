import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

type BroadcastFn = (msg: Record<string, unknown>) => void;

export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  broadcast: BroadcastFn,
): Promise<void> {
  const tmpDir = path.join(os.tmpdir(), "pi-cy-vision");
  fs.mkdirSync(tmpDir, { recursive: true });

  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const tmpFile = path.join(tmpDir, `vision-${Date.now()}.${ext}`);
  fs.writeFileSync(tmpFile, Buffer.from(imageBase64, "base64"));

  const args = [
    "--print",
    "--model", "mimo-v2.5",
    "--provider", "xiaomi-token-plan-cn",
    `请分析这张图片并回答以下问题：${prompt}`,
    `@${tmpFile}`,
  ];

  return new Promise<void>((resolve) => {
    broadcast({ type: "message_start" });

    const proc = spawn("pi", args, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      broadcast({
        type: "message_update",
        delta: [{ type: "text", text }],
      });
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

      if (code !== 0 && !stdout) {
        broadcast({
          type: "error",
          msg: `识图失败 (exit ${code}): ${stderr.slice(0, 300)}`,
        });
      }

      broadcast({
        type: "message_end",
        usage: { input_tokens: 0, output_tokens: 0 },
      });
      resolve();
    });

    proc.on("error", (err) => {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
      broadcast({
        type: "error",
        msg: `识图进程启动失败: ${err.message}. 请确认 pi CLI 已安装且 mimo-v2.5 模型可用.`,
      });
      resolve();
    });
  });
}
