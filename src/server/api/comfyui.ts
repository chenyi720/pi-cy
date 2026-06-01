import http from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const COMFYUI_URL = process.env.COMFYUI_URL || "http://127.0.0.1:8188";

interface ComfyPromptResponse {
  prompt_id: string;
  number: number;
  node_errors: Record<string, unknown>;
}

interface ComfyHistoryResponse {
  [promptId: string]: {
    outputs: {
      [nodeId: string]: {
        images?: Array<{ filename: string; subfolder: string; type: string }>;
      };
    };
    status: { status_str: string; completed: boolean };
  };
}

function buildWorkflow(prompt: string, negativePrompt = "", width = 1024, height = 1024, steps = 0, seed?: number): Record<string, unknown> {
  const actualSeed = seed ?? Math.floor(Math.random() * 2 ** 32);
  return {
    "4": {
      class_type: "HiDreamO1ModelLoader",
      inputs: {
        model_name: "HiDream-O1-Image-Dev-2604-FP8",
        precision: "auto",
        attention: "auto",
        download_if_missing: false,
      },
    },
    "5": {
      class_type: "HiDreamO1Conditioning",
      inputs: {
        prompt,
        enhanced_prompt: "",
        negative_prompt: negativePrompt || "",
      },
    },
    "3": {
      class_type: "HiDreamO1Sampler",
      inputs: {
        model: ["4", 0],
        conditioning: ["5", 0],
        model_type: "auto",
        width,
        height,
        steps,
        seed: actualSeed,
        guidance_scale: 5.0,
        shift: -1.0,
        noise_scale_start: 7.5,
        noise_scale_end: 7.5,
        noise_clip_std: 2.5,
        dev_editing_scheduler: "flow_match",
        layout_bboxes: "",
        preview_every: 4,
        keep_image1_aspect: false,
        force_offload: false,
        image: "0",
      },
    },
    "6": {
      class_type: "SaveImage",
      inputs: {
        images: ["3", 0],
        filename_prefix: "pi-cy",
      },
    },
  };
}

async function queuePrompt(workflow: Record<string, unknown>): Promise<ComfyPromptResponse> {
  const clientId = randomUUID();
  const body = JSON.stringify({ prompt: workflow, client_id: clientId });

  return new Promise((resolve, reject) => {
    const req = http.request(
      `${COMFYUI_URL}/prompt`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function getHistory(promptId: string): Promise<ComfyHistoryResponse> {
  return new Promise((resolve, reject) => {
    http.get(`${COMFYUI_URL}/history/${promptId}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Failed to parse history: ${data.slice(0, 200)}`));
        }
      });
    }).on("error", reject);
  });
}

function getImage(filename: string, subfolder: string): Promise<Buffer> {
  const url = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=output`;
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

async function waitForCompletion(promptId: string, timeoutMs = 180000): Promise<ComfyHistoryResponse[string]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const history = await getHistory(promptId);
    if (history[promptId]?.status?.completed) {
      return history[promptId];
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Image generation timed out");
}

export async function generateImage(
  prompt: string,
  options: {
    negativePrompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    seed?: number;
  } = {},
): Promise<{ imagePath: string; seed: number }> {
  const workflow = buildWorkflow(
    prompt,
    options.negativePrompt,
    options.width || 1024,
    options.height || 1024,
    options.steps || 0,
    options.seed,
  );

  const { prompt_id } = await queuePrompt(workflow);
  const result = await waitForCompletion(prompt_id);

  const firstOutput = Object.values(result.outputs).find((o) => o.images?.length);
  if (!firstOutput?.images?.[0]) {
    throw new Error("No image generated");
  }

  const img = firstOutput.images[0];
  const imageBuffer = await getImage(img.filename, img.subfolder);

  const outputDir = path.join(process.cwd(), "media", "generated");
  fs.mkdirSync(outputDir, { recursive: true });
  const outFilename = `pi-cy-${Date.now()}.png`;
  const outPath = path.join(outputDir, outFilename);
  fs.writeFileSync(outPath, imageBuffer);

  return { imagePath: outPath, seed: (workflow["3"] as { inputs: { seed: number } }).inputs.seed };
}

export async function isComfyUIAvailable(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    http
      .get(`${COMFYUI_URL}/system_stats`, { timeout: 3000 }, (res) => {
        resolve(res.statusCode === 200);
      })
      .on("error", () => resolve(false));
  });
}
