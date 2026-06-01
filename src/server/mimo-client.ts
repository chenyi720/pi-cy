import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getAllTools } from "./tools/registry.js";
import { executeTool } from "./tools/executor.js";

const BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1";

interface MimoMessage {
  role: "user" | "assistant" | "system";
  content: string | MimoContent[];
}

interface MimoContent {
  type: "text" | "image_url" | "tool_use" | "tool_result";
  text?: string;
  image_url?: { url: string };
  tool_use?: { id: string; name: string; input: Record<string, unknown> };
  tool_result?: { tool_use_id: string; content: string };
}

interface MimoTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

interface MimoResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

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

function toolsToMimoFormat(): MimoTool[] {
  return getAllTools()
    .filter((t) => t.name !== "web_search")
    .map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object" as const,
          properties: tool.parameters,
          required: Object.entries(tool.parameters)
            .filter(([_, def]) => def.required)
            .map(([key]) => key),
        },
      },
    }));
}

export interface MimoChatOptions {
  model?: string;
  thinking?: "enabled" | "disabled";
  thinkingBudget?: number;
  webSearch?: boolean;
  stream?: boolean;
}

export async function mimoChat(
  messages: MimoMessage[],
  broadcast: BroadcastFn,
  options: MimoChatOptions = {},
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    broadcast({ type: "error", msg: "MiMo API key not configured" });
    return "";
  }

  const model = options.model || "mimo-v2.5-pro";
  const tools = toolsToMimoFormat();

  if (options.webSearch !== false) {
    tools.push({
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web for real-time information",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
      },
    });
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 0.95,
    stream: false,
    tools: tools.length > 0 ? tools : undefined,
  };

  if (options.thinking === "enabled") {
    body.thinking = {
      type: "enabled",
      budget_tokens: options.thinkingBudget || 10000,
    };
  }

  return new Promise((resolve) => {
    const bodyStr = JSON.stringify(body);
    const url = new URL(`${BASE_URL}/chat/completions`);

    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", async () => {
          if (res.statusCode !== 200) {
            broadcast({ type: "error", msg: `MiMo API error ${res.statusCode}: ${data.slice(0, 300)}` });
            resolve("");
            return;
          }

          try {
            const resp: MimoResponse = JSON.parse(data);
            const choice = resp.choices?.[0];

            if (!choice) {
              resolve("");
              return;
            }

            if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
              broadcast({ type: "message_update", delta: [{ type: "text", text: "" }] });

              for (const toolCall of choice.message.tool_calls) {
                const toolName = toolCall.function.name;
                let toolArgs: Record<string, unknown> = {};
                try {
                  toolArgs = JSON.parse(toolCall.function.arguments);
                } catch { /* empty */ }

                broadcast({
                  type: "tool_execution_start",
                  tool_call_id: toolCall.id,
                  tool_name: toolName,
                  tool_arguments: toolArgs,
                });

                if (toolName === "web_search") {
                  const query = toolArgs.query as string;
                  broadcast({
                    type: "tool_execution_end",
                    tool_call_id: toolCall.id,
                    result: `[Web search for: ${query}] - Use MiMo native web_search tool`,
                    status: "success",
                  });
                } else {
                  const result = await executeTool(toolName, toolArgs, process.cwd());
                  broadcast({
                    type: "tool_execution_end",
                    tool_call_id: toolCall.id,
                    result: result.output || result.error || "",
                    status: result.error ? "error" : "success",
                  });
                }
              }

              const toolMessages: MimoMessage[] = [
                ...messages,
                {
                  role: "assistant",
                  content: choice.message.content || "",
                },
              ];

              for (const toolCall of choice.message.tool_calls) {
                toolMessages.push({
                  role: "user",
                  content: [{
                    type: "tool_result",
                    tool_result: {
                      tool_use_id: toolCall.id,
                      content: "Tool executed successfully",
                    },
                  }],
                });
              }

              const followUp = await mimoChat(toolMessages, broadcast, options);
              resolve(followUp);
            } else {
              const content = choice.message.content || "";
              broadcast({
                type: "message_update",
                delta: [{ type: "text", text: content }],
              });
              resolve(content);
            }
          } catch (e) {
            broadcast({ type: "error", msg: `Parse error: ${(e as Error).message}` });
            resolve("");
          }
        });
      },
    );

    req.on("error", (err) => {
      broadcast({ type: "error", msg: `MiMo API error: ${err.message}` });
      resolve("");
    });

    req.write(bodyStr);
    req.end();
  });
}
