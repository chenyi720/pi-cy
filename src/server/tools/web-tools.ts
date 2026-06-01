import https from "node:https";
import http from "node:http";
import { registerTool } from "./registry.js";

function fetchUrl(url: string, maxBytes = 50000): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, maxBytes).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = "";
      let bytes = 0;
      res.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          res.destroy();
          resolve(data);
          return;
        }
        data += chunk.toString();
      });
      res.on("end", () => resolve(data));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

registerTool({
  name: "web_fetch",
  description: "Fetch content from a URL",
  category: "web",
  permission: "auto",
  parameters: {
    url: { type: "string", description: "URL to fetch", required: true },
  },
  async execute(params) {
    const url = params.url as string;
    try {
      const content = await fetchUrl(url);
      return { output: content.slice(0, 10000) };
    } catch (e) {
      return { output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "web_search",
  description: "Search the web using DuckDuckGo Lite",
  category: "web",
  permission: "auto",
  parameters: {
    query: { type: "string", description: "Search query", required: true },
  },
  async execute(params) {
    const query = encodeURIComponent(params.query as string);
    try {
      const html = await fetchUrl(`https://lite.duckduckgo.com/lite/?q=${query}`, 30000);
      const results: string[] = [];
      const linkRegex = /<a[^>]+href="([^"]+)"[^>]*class="result-link"[^>]*>([^<]+)<\/a>/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        results.push(`${match[2].trim()}: ${match[1]}`);
      }
      if (results.length === 0) {
        const textRegex = /<td[^>]*>([^<]{10,200})<\/td>/gi;
        while ((match = textRegex.exec(html)) !== null) {
          const text = match[1].trim();
          if (text && !text.startsWith("S") && !text.startsWith("R")) {
            results.push(text);
          }
        }
      }
      return { output: results.slice(0, 10).join("\n") || "No results" };
    } catch (e) {
      return { output: "", error: (e as Error).message };
    }
  },
});
