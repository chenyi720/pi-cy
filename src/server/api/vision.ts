import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

type BroadcastFn = (msg: Record<string, unknown>) => void;

function getApiKey(): string {
  try {
    const authPath = path.join(os.homedir(), ".pi", "agent", "auth.json");
    const auth = JSON.parse(fs.readFileSync(authPath, "utf-8"));
    return auth["xiaomi-token-plan-cn"]?.key || "";
  } catch {
    return "";
  }
}

const BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1";
const MODEL = "mimo-v2.5";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

function buildMessages(
  prompt: string,
  imageBase64: string,
  mimeType: string,
): ChatMessage[] {
  return [
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${imageBase64}` },
        },
        { type: "text", text: prompt },
      ],
    },
  ];
}

function parseSSELine(line: string): string | null {
  if (!line.startsWith("data: ")) return null;
  const data = line.slice(6).trim();
  if (data === "[DONE]") return "__DONE__";
  return data;
}

export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  broadcast: BroadcastFn,
): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    broadcast({ type: "error", msg: "Xiaomi API key not configured. Run `pi config` to set it." });
    return;
  }

  const body = JSON.stringify({
    model: MODEL,
    messages: buildMessages(prompt, imageBase64, mimeType),
    stream: true,
  });

  const url = new URL(`${BASE_URL}/chat/completions`);

  return new Promise<void>((resolve) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          let errData = "";
          res.on("data", (chunk) => (errData += chunk));
          res.on("end", () => {
            broadcast({ type: "error", msg: `Vision API error ${res.statusCode}: ${errData.slice(0, 300)}` });
            resolve();
          });
          return;
        }

        broadcast({ type: "message_start" });

        let buffer = "";
        let fullContent = "";

        res.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const data = parseSSELine(trimmed);
            if (!data) continue;
            if (data === "__DONE__") {
              broadcast({
                type: "message_end",
                usage: { input_tokens: 0, output_tokens: 0 },
              });
              resolve();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) {
                fullContent += delta.content;
                broadcast({
                  type: "message_update",
                  delta: [{ type: "text", text: delta.content }],
                });
              }
            } catch { /* skip malformed chunks */ }
          }
        });

        res.on("end", () => {
          if (fullContent) {
            broadcast({
              type: "message_end",
              usage: { input_tokens: 0, output_tokens: 0 },
            });
          }
          resolve();
        });

        res.on("error", (err) => {
          broadcast({ type: "error", msg: `Vision API stream error: ${err.message}` });
          resolve();
        });
      },
    );

    req.on("error", (err) => {
      broadcast({ type: "error", msg: `Vision API request error: ${err.message}` });
      resolve();
    });

    req.write(body);
    req.end();
  });
}
