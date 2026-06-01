import type http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { safePath, getProjectDir } from "../security.js";
import { isAlive } from "../rpc.js";
import { generateImage, isComfyUIAvailable } from "./comfyui.js";

function readJson(filePath: string): unknown {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {
    console.error(`Failed to read ${filePath}: ${(e as Error).message}`);
  }
  return undefined;
}

function getPiDir(): string {
  return path.join(os.homedir(), ".pi", "agent");
}

function getGitBranch(cwd: string): string | null {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
}

function parseWorktreeList(raw: string): Array<{ path: string; head: string; branch: string }> {
  const worktrees: Array<{ path: string; head: string; branch: string }> = [];
  let current: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    if (!line.trim()) {
      if (current.path) {
        worktrees.push({ path: current.path, head: current.head ?? "", branch: current.branch ?? "" });
      }
      current = {};
      continue;
    }
    const [key, ...rest] = line.split(" ");
    current[key] = rest.join(" ");
  }
  if (current.path) {
    worktrees.push({ path: current.path, head: current.head ?? "", branch: current.branch ?? "" });
  }
  return worktrees;
}

export function setupApi(server: http.Server): void {
  // Use native http for simple JSON API (avoids Express dependency)
  const handleRequest = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const method = req.method || "GET";
    const sendJson = (data: unknown, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };

    // GET /api/config
    if (method === "GET" && url.pathname === "/api/config") {
      const piDir = getPiDir();
      return sendJson({
        settings: readJson(path.join(piDir, "settings.json")),
        models: readJson(path.join(piDir, "models.json")),
        alive: isAlive(),
      });
    }

    // POST /api/config
    if (method === "POST" && url.pathname === "/api/config") {
      const body = await readBody(req);
      try {
        const piDir = getPiDir();
        if (body.settings) {
          fs.writeFileSync(
            path.join(piDir, "settings.json"),
            JSON.stringify(body.settings, null, 2),
          );
        }
        if (body.models) {
          fs.writeFileSync(
            path.join(piDir, "models.json"),
            JSON.stringify(body.models, null, 2),
          );
        }
        return sendJson({ ok: true });
      } catch (e) {
        return sendJson({ error: (e as Error).message }, 500);
      }
    }

    // GET /api/models
    if (method === "GET" && url.pathname === "/api/models") {
      try {
        const raw = execSync("pi --list-models 2>&1", {
          encoding: "utf-8",
          timeout: 15000,
          windowsHide: true,
        });
        const lines = raw.split("\n").filter((l) => l.trim());
        const models: Array<Record<string, string>> = [];
        for (const line of lines) {
          const parts = line.trim().split(/\s{2,}/);
          if (parts.length >= 4 && parts[0] !== "provider") {
            models.push({
              provider: parts[0],
              id: parts[1],
              name: parts[1],
              context: parts[2] || "",
              maxTokens: parts[3] || "",
              reasoning: parts[4] || "no",
              images: parts[5] || "no",
            });
          }
        }
        return sendJson(models);
      } catch {
        return sendJson([]);
      }
    }

    // GET /api/files
    if (method === "GET" && url.pathname === "/api/files") {
      const dir = safePath(url.searchParams.get("path") || undefined);
      if (!dir || !fs.existsSync(dir)) return sendJson([]);
      try {
        const items = fs
          .readdirSync(dir, { withFileTypes: true })
          .map((d) => ({
            name: d.name,
            isDir: d.isDirectory(),
            path: path.join(dir, d.name),
          }));
        return sendJson(items);
      } catch {
        return sendJson([]);
      }
    }

    // GET /api/file
    if (method === "GET" && url.pathname === "/api/file") {
      const p = safePath(url.searchParams.get("path") || undefined);
      if (!p) return sendJson({ error: "path required or not allowed" }, 400);
      try {
        return sendJson({ content: fs.readFileSync(p, "utf-8") });
      } catch {
        return sendJson({ error: "not found" }, 404);
      }
    }

    // GET /api/sessions
    if (method === "GET" && url.pathname === "/api/sessions") {
      const dir = path.join(os.homedir(), ".pi", "agent", "sessions");
      try {
        if (!fs.existsSync(dir)) return sendJson([]);
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const sessions: Array<{
          name: string;
          file: string;
          path: string;
          modified: number;
          size: number;
        }> = [];
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const dp = path.join(dir, entry.name);
            const files = fs.readdirSync(dp).filter((f) => f.endsWith(".jsonl"));
            for (const f of files) {
              const s = fs.statSync(path.join(dp, f));
              sessions.push({
                name: entry.name,
                file: f,
                path: path.join(dp, f),
                modified: s.mtimeMs,
                size: s.size,
              });
            }
          }
        }
        return sendJson(sessions.sort((a, b) => b.modified - a.modified).slice(0, 50));
      } catch {
        return sendJson([]);
      }
    }

    // GET /api/session-detail
    if (method === "GET" && url.pathname === "/api/session-detail") {
      const p = safePath(url.searchParams.get("path") || undefined);
      if (!p || !fs.existsSync(p)) return sendJson({ error: "not found" }, 404);
      try {
        const content = fs.readFileSync(p, "utf-8");
        const messages: unknown[] = [];
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const obj = JSON.parse(trimmed);
            if (obj.type === "message") messages.push(obj.message);
          } catch { /* ignore */ }
        }
        return sendJson({ messages });
      } catch (e) {
        return sendJson({ error: (e as Error).message }, 500);
      }
    }

    // DELETE /api/session-detail
    if (method === "DELETE" && url.pathname === "/api/session-detail") {
      const p = safePath(url.searchParams.get("path") || undefined);
      if (!p || !fs.existsSync(p)) return sendJson({ error: "not found" }, 404);
      try {
        fs.unlinkSync(p);
        const parentDir = path.dirname(p);
        if (fs.readdirSync(parentDir).length === 0) fs.rmdirSync(parentDir);
        return sendJson({ ok: true });
      } catch (e) {
        return sendJson({ error: (e as Error).message }, 500);
      }
    }

    // GET /api/git/status
    if (method === "GET" && url.pathname === "/api/git/status") {
      const cwd = getProjectDir() || process.cwd();
      try {
        const raw = execSync("git status --porcelain=v1 -u", {
          cwd,
          encoding: "utf-8",
          timeout: 10000,
          windowsHide: true,
        });
        const files = raw
          .split("\n")
          .filter((l) => l.trim())
          .map((line) => {
            const status = line.slice(0, 2).trim();
            const filePath = line.slice(3).trim();
            return { status, path: filePath };
          });
        return sendJson({ files, branch: getGitBranch(cwd) });
      } catch (e) {
        return sendJson({ files: [], branch: null, error: (e as Error).message });
      }
    }

    // GET /api/git/worktrees
    if (method === "GET" && url.pathname === "/api/git/worktrees") {
      const cwd = getProjectDir() || process.cwd();
      try {
        const raw = execSync("git worktree list --porcelain", {
          cwd,
          encoding: "utf-8",
          timeout: 10000,
          windowsHide: true,
        });
        const worktrees = parseWorktreeList(raw);
        return sendJson(worktrees);
      } catch {
        return sendJson([]);
      }
    }

    // POST /api/git/worktree/add
    if (method === "POST" && url.pathname === "/api/git/worktree/add") {
      const body = await readBody(req);
      const cwd = getProjectDir() || process.cwd();
      const { branch, path: wtPath } = body as { branch: string; path?: string };
      if (!branch) return sendJson({ error: "branch required" }, 400);
      try {
        const targetPath = wtPath || path.join(cwd, ".worktrees", branch);
        execSync(`git worktree add "${targetPath}" "${branch}"`, {
          cwd,
          encoding: "utf-8",
          timeout: 30000,
          windowsHide: true,
        });
        return sendJson({ ok: true, path: targetPath });
      } catch (e) {
        return sendJson({ error: (e as Error).message }, 500);
      }
    }

    // DELETE /api/git/worktree
    if (method === "DELETE" && url.pathname === "/api/git/worktree") {
      const wtPath = url.searchParams.get("path");
      const cwd = getProjectDir() || process.cwd();
      if (!wtPath) return sendJson({ error: "path required" }, 400);
      try {
        execSync(`git worktree remove "${wtPath}" --force`, {
          cwd,
          encoding: "utf-8",
          timeout: 30000,
          windowsHide: true,
        });
        return sendJson({ ok: true });
      } catch (e) {
        return sendJson({ error: (e as Error).message }, 500);
      }
    }

    // GET /api/git/branches
    if (method === "GET" && url.pathname === "/api/git/branches") {
      const cwd = getProjectDir() || process.cwd();
      try {
        const raw = execSync("git branch -a --format=%(refname:short)", {
          cwd,
          encoding: "utf-8",
          timeout: 10000,
          windowsHide: true,
        });
        const branches = raw.split("\n").filter((b) => b.trim());
        return sendJson(branches);
      } catch {
        return sendJson([]);
      }
    }

    // GET /api/search
    if (method === "GET" && url.pathname === "/api/search") {
      const q = url.searchParams.get("q");
      const searchPath = url.searchParams.get("path") || getProjectDir() || process.cwd();
      if (!q) return sendJson([]);
      const safeSearchPath = safePath(searchPath);
      if (!safeSearchPath) return sendJson([]);
      try {
        const raw = execSync(
          `findstr /S /N /I /C:"${q.replace(/"/g, '')}" "${safeSearchPath}\\*.ts" "${safeSearchPath}\\*.tsx" "${safeSearchPath}\\*.js" "${safeSearchPath}\\*.jsx"`,
          { encoding: "utf-8", timeout: 15000, windowsHide: true },
        );
        const results: Array<{ path: string; file: string; line: number; text: string }> = [];
        for (const line of raw.split("\n")) {
          const match = line.match(/^(.+?):(\d+):(.*)$/);
          if (match) {
            const filePath = match[1];
            const lineNum = parseInt(match[2], 10);
            const text = match[3].trim();
            const fileName = filePath.split(/[/\\]/).pop() || filePath;
            results.push({ path: filePath, file: fileName, line: lineNum, text });
          }
        }
        return sendJson(results.slice(0, 50));
      } catch {
        return sendJson([]);
      }
    }

    // GET /api/comfyui/status
    if (method === "GET" && url.pathname === "/api/comfyui/status") {
      const available = await isComfyUIAvailable();
      return sendJson({ available, url: process.env.COMFYUI_URL || "http://127.0.0.1:8188" });
    }

    // POST /api/comfyui/generate
    if (method === "POST" && url.pathname === "/api/comfyui/generate") {
      const body = await readBody(req);
      const prompt = body.prompt as string;
      if (!prompt) return sendJson({ error: "prompt required" }, 400);
      try {
        const result = await generateImage(prompt, {
          negativePrompt: body.negativePrompt as string,
          width: body.width as number,
          height: body.height as number,
          steps: body.steps as number,
          seed: body.seed as number,
        });
        return sendJson(result);
      } catch (e) {
        return sendJson({ error: (e as Error).message }, 500);
      }
    }

    // GET /api/comfyui/image
    if (method === "GET" && url.pathname === "/api/comfyui/image") {
      const imgPath = url.searchParams.get("path");
      if (!imgPath) {
        res.writeHead(404);
        return res.end("Not found");
      }
      const safeImgPath = safePath(imgPath);
      if (!safeImgPath || !fs.existsSync(safeImgPath)) {
        res.writeHead(404);
        return res.end("Not found");
      }
      const generatedDir = path.resolve(path.join(process.cwd(), "media", "generated"));
      if (!safeImgPath.startsWith(generatedDir + path.sep)) {
        res.writeHead(403);
        return res.end("Forbidden");
      }
      try {
        const data = fs.readFileSync(safeImgPath);
        res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
        return res.end(data);
      } catch {
        res.writeHead(500);
        return res.end("Error");
      }
    }

    return null; // Not handled
  };

  // Attach as request listener (works alongside WebSocket)
  const originalListener = server.listeners("request")[0] as
    | ((req: http.IncomingMessage, res: http.ServerResponse) => void)
    | undefined;

  server.removeAllListeners("request");
  server.on("request", async (req, res) => {
    const handled = await handleRequest(req, res);
    if (!handled && originalListener) {
      originalListener(req, res);
    }
  });
}

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}
