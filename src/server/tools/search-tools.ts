import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { registerTool } from "./registry.js";
import { sandboxPath } from "./sandbox.js";

function globMatch(pattern: string, name: string): boolean {
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "⟨GLOBSTAR⟩")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, "[^/]")
        .replace(/⟨GLOBSTAR⟩/g, ".*") +
      "$",
  );
  return regex.test(name);
}

function walkDir(dir: string, results: string[]): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, results);
      } else {
        results.push(fullPath);
      }
    }
  } catch { /* ignore permission errors */ }
}

registerTool({
  name: "glob",
  description: "Find files matching a glob pattern",
  category: "search",
  permission: "auto",
  parameters: {
    pattern: { type: "string", description: "Glob pattern (e.g. **/*.ts)", required: true },
    path: { type: "string", description: "Root directory to search in", required: true },
  },
  async execute(params) {
    const rootPath = sandboxPath(params.path as string);
    if (!rootPath) return { output: "", error: "Path not allowed" };
    const pattern = params.pattern as string;
    const allFiles: string[] = [];
    walkDir(rootPath, allFiles);
    const matched = allFiles.filter((f) => {
      const rel = path.relative(rootPath, f).replace(/\\/g, "/");
      return globMatch(pattern, rel) || globMatch(pattern, path.basename(f));
    });
    return { output: matched.slice(0, 100).join("\n") || "No files found" };
  },
});

registerTool({
  name: "grep",
  description: "Search file contents using regex",
  category: "search",
  permission: "auto",
  parameters: {
    pattern: { type: "string", description: "Regex pattern to search for", required: true },
    path: { type: "string", description: "Root directory to search in", required: true },
    include: { type: "string", description: "File pattern to include (e.g. *.ts)", default: "*" },
  },
  async execute(params) {
    const rootPath = sandboxPath(params.path as string);
    if (!rootPath) return { output: "", error: "Path not allowed" };
    const pattern = params.pattern as string;
    const include = (params.include as string) || "*";
    try {
      const output = execSync(
        `findstr /S /N /R /C:"${pattern.replace(/"/g, '')}" "${rootPath}\\${include}"`,
        { encoding: "utf-8", timeout: 15000, windowsHide: true, maxBuffer: 1024 * 1024 },
      );
      return { output: output.trim().slice(0, 10000) || "No matches" };
    } catch {
      return { output: "No matches" };
    }
  },
});

registerTool({
  name: "ls",
  description: "List directory contents",
  category: "search",
  permission: "auto",
  parameters: {
    path: { type: "string", description: "Directory path to list", required: true },
  },
  async execute(params) {
    const dirPath = sandboxPath(params.path as string);
    if (!dirPath) return { output: "", error: "Path not allowed" };
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const lines = entries.map((e) => {
        const icon = e.isDirectory() ? "[DIR]" : "[FILE]";
        return `${icon} ${e.name}`;
      });
      return { output: lines.join("\n") || "Empty directory" };
    } catch (e) {
      return { output: "", error: (e as Error).message };
    }
  },
});
