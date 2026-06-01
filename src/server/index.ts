import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { setupWebSocket, getBroadcast } from "./ws.js";
import { setBroadcast, startPi, killPi } from "./rpc.js";
import { setupApi } from "./api/index.js";
import { addAllowedRoot, getToolSchemas } from "./tools/index.js";

const PORT = Number(process.env.PORT) || 3456;

// Serve static files from dist/ (Vite build output)
const distDir = path.resolve(import.meta.dirname, "../../dist");

const server = http.createServer((req, res) => {
  // Serve static files
  if (req.method === "GET" && !req.url?.startsWith("/api")) {
    let filePath = path.join(distDir, req.url === "/" ? "index.html" : req.url!);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(distDir, "index.html");
    }
    const ext = path.extname(filePath);
    const mimeTypes: Record<string, string> = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".ico": "image/x-icon",
      ".svg": "image/svg+xml",
    };
    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not Found");
    }
  }
});

// Setup WebSocket
setupWebSocket(server);

// Wire broadcast to RPC
setBroadcast(getBroadcast());

// Setup REST API
setupApi(server);

// Error handling
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[FATAL] Port ${PORT} already in use.`);
    process.exit(1);
  }
  console.error("Server error:", err);
  process.exit(1);
});

// Graceful shutdown
const shutdown = () => {
  killPi();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("exit", () => killPi());

// Initialize tools sandbox with project directory
addAllowedRoot(process.cwd());
addAllowedRoot(path.join(process.env.USERPROFILE || process.env.HOME || "", ".pi"));

// Start
server.listen(PORT, () => {
  console.log(`PI-CY running at http://localhost:${PORT}`);
  console.log(`Tools available: ${getToolSchemas().map((t) => t.name).join(", ")}`);
  startPi({
    provider: "xiaomi-token-plan-cn",
    model: "mimo-v2.5-pro",
    thinking: "medium",
  });
});
