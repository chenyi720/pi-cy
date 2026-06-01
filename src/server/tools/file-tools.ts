import fs from "node:fs";
import path from "node:path";
import { registerTool } from "./registry.js";
import { sandboxPath } from "./sandbox.js";

registerTool({
  name: "read_file",
  description: "Read the contents of a file",
  category: "read",
  permission: "auto",
  parameters: {
    path: { type: "string", description: "Absolute path to the file", required: true },
    offset: { type: "number", description: "Line number to start from (1-indexed)", default: 1 },
    limit: { type: "number", description: "Maximum number of lines to read", default: 2000 },
  },
  async execute(params) {
    const filePath = sandboxPath(params.path as string);
    if (!filePath) return { output: "", error: "Path not allowed" };
    if (!fs.existsSync(filePath)) return { output: "", error: "File not found" };
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const offset = Math.max(1, (params.offset as number) || 1) - 1;
      const limit = (params.limit as number) || 2000;
      const slice = lines.slice(offset, offset + limit);
      const numbered = slice.map((line, i) => `${offset + i + 1}: ${line}`).join("\n");
      return { output: numbered };
    } catch (e) {
      return { output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "write_file",
  description: "Write content to a file (creates or overwrites)",
  category: "write",
  permission: "confirm",
  parameters: {
    path: { type: "string", description: "Absolute path to the file", required: true },
    content: { type: "string", description: "Content to write", required: true },
  },
  async execute(params) {
    const filePath = sandboxPath(params.path as string);
    if (!filePath) return { output: "", error: "Path not allowed" };
    try {
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, params.content as string, "utf-8");
      return { output: `Written ${filePath}` };
    } catch (e) {
      return { output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "edit_file",
  description: "Edit a file by replacing old_string with new_string",
  category: "write",
  permission: "confirm",
  parameters: {
    path: { type: "string", description: "Absolute path to the file", required: true },
    old_string: { type: "string", description: "String to find and replace", required: true },
    new_string: { type: "string", description: "Replacement string", required: true },
  },
  async execute(params) {
    const filePath = sandboxPath(params.path as string);
    if (!filePath) return { output: "", error: "Path not allowed" };
    if (!fs.existsSync(filePath)) return { output: "", error: "File not found" };
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const oldStr = params.old_string as string;
      const newStr = params.new_string as string;
      if (!content.includes(oldStr)) {
        return { output: "", error: "old_string not found in file" };
      }
      const count = content.split(oldStr).length - 1;
      const updated = content.replace(oldStr, newStr);
      fs.writeFileSync(filePath, updated, "utf-8");
      return { output: `Replaced 1 occurrence in ${filePath} (${count} total matches found)` };
    } catch (e) {
      return { output: "", error: (e as Error).message };
    }
  },
});
