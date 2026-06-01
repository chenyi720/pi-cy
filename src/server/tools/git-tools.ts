import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { registerTool } from "./registry.js";

const WORKTREE_BASE = ".git/worktrees-pi";

function ensureWorktreeDir(): string {
  const base = path.join(process.cwd(), WORKTREE_BASE);
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return base;
}

registerTool({
  name: "git_worktree_list",
  description: "List all git worktrees",
  category: "execute",
  permission: "auto",
  parameters: {},
  async execute(_params, cwd) {
    try {
      const output = execSync("git worktree list --porcelain", {
        cwd,
        encoding: "utf-8",
        timeout: 5000,
        windowsHide: true,
      });
      return { output: output.trim() || "No worktrees" };
    } catch (e) {
      return { output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "git_worktree_create",
  description: "Create a new git worktree for isolated work",
  category: "execute",
  permission: "confirm",
  parameters: {
    branch: { type: "string", description: "Branch name for the worktree", required: true },
    base_branch: { type: "string", description: "Base branch to create from (default: current)", default: "" },
  },
  async execute(params, cwd) {
    const branch = params.branch as string;
    const baseBranch = (params.base_branch as string) || "";
    const base = ensureWorktreeDir();
    const worktreePath = path.join(base, branch);

    try {
      if (fs.existsSync(worktreePath)) {
        return { output: "", error: `Worktree already exists: ${worktreePath}` };
      }

      const createBranch = baseBranch
        ? `git worktree add -b ${branch} ${worktreePath} ${baseBranch}`
        : `git worktree add ${worktreePath} ${branch}`;

      const output = execSync(createBranch, {
        cwd,
        encoding: "utf-8",
        timeout: 15000,
        windowsHide: true,
      });

      return {
        output: `Worktree created: ${worktreePath}\nBranch: ${branch}\n${output.trim()}`,
        metadata: { path: worktreePath, branch },
      };
    } catch (e) {
      return { output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "git_worktree_remove",
  description: "Remove a git worktree",
  category: "execute",
  permission: "confirm",
  parameters: {
    path: { type: "string", description: "Path to the worktree to remove", required: true },
  },
  async execute(params, cwd) {
    const worktreePath = params.path as string;
    try {
      const output = execSync(`git worktree remove ${worktreePath} --force`, {
        cwd,
        encoding: "utf-8",
        timeout: 10000,
        windowsHide: true,
      });
      return { output: `Worktree removed: ${worktreePath}\n${output.trim()}` };
    } catch (e) {
      return { output: "", error: (e as Error).message };
    }
  },
});

registerTool({
  name: "git_worktree_exec",
  description: "Execute a command in a specific worktree directory",
  category: "execute",
  permission: "confirm",
  parameters: {
    worktree_path: { type: "string", description: "Path to the worktree", required: true },
    command: { type: "string", description: "Command to execute", required: true },
  },
  async execute(params) {
    const worktreePath = params.worktree_path as string;
    const command = params.command as string;

    if (!fs.existsSync(worktreePath)) {
      return { output: "", error: `Worktree not found: ${worktreePath}` };
    }

    try {
      const output = execSync(command, {
        cwd: worktreePath,
        encoding: "utf-8",
        timeout: 30000,
        windowsHide: true,
        shell: true,
        maxBuffer: 1024 * 1024,
      });
      return { output: output.trim() || "(no output)" };
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      return {
        output: (err.stdout || "").trim(),
        error: (err.stderr || err.message || "").trim(),
      };
    }
  },
});
