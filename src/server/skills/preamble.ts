import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export interface PreambleContext {
  projectDir: string;
  sessionId: string;
  timestamp: string;
  gitBranch: string;
  gitDirty: number;
  platform: string;
}

export function generatePreambleContext(projectDir: string): PreambleContext {
  let gitBranch = "unknown";
  let gitDirty = 0;

  try {
    gitBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: projectDir,
      encoding: "utf-8",
      timeout: 5000,
      windowsHide: true,
    }).trim();
  } catch { /* not a git repo */ }

  try {
    const status = execSync("git status --porcelain", {
      cwd: projectDir,
      encoding: "utf-8",
      timeout: 5000,
      windowsHide: true,
    }).trim();
    gitDirty = status ? status.split("\n").length : 0;
  } catch { /* ignore */ }

  return {
    projectDir,
    sessionId: `session-${Date.now()}`,
    timestamp: new Date().toISOString(),
    gitBranch,
    gitDirty,
    platform: process.platform,
  };
}

export function generatePreamble(tier: number, ctx: PreambleContext): string {
  const sections: string[] = [];

  sections.push(`## Session Context`);
  sections.push(`- Session ID: ${ctx.sessionId}`);
  sections.push(`- Timestamp: ${ctx.timestamp}`);
  sections.push(`- Project: ${ctx.projectDir}`);
  sections.push(`- Git Branch: ${ctx.gitBranch}`);
  sections.push(`- Git Dirty: ${ctx.gitDirty} files`);
  sections.push(`- Platform: ${ctx.platform}`);
  sections.push(``);

  if (tier >= 2) {
    sections.push(`## Project Rules`);
    const rulesFiles = ["AGENTS.md", ".pi-rules", ".roorules", "CLAUDE.md"];
    for (const rulesFile of rulesFiles) {
      const rulesPath = path.join(ctx.projectDir, rulesFile);
      if (fs.existsSync(rulesPath)) {
        try {
          const content = fs.readFileSync(rulesPath, "utf-8").trim();
          if (content) {
            sections.push(`### ${rulesFile}`);
            sections.push(content.slice(0, 2000));
            sections.push(``);
          }
        } catch { /* ignore */ }
      }
    }
  }

  if (tier >= 3) {
    sections.push(`## Behavioral Guidelines`);
    sections.push(`- Before making changes, read the relevant files first`);
    sections.push(`- After making changes, verify they work (run tests, type check, lint)`);
    sections.push(`- When uncertain, ask the user before proceeding`);
    sections.push(`- Report completion status: DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT`);
    sections.push(``);
  }

  if (tier >= 4) {
    sections.push(`## Tool Usage`);
    sections.push(`- Use dedicated tools (read_file, write_file, edit_file) over bash when possible`);
    sections.push(`- Batch independent tool calls; serialize dependent ones`);
    sections.push(`- Always read file content before editing it`);
    sections.push(``);

    const learningsPath = path.join(ctx.projectDir, ".pi-cy", "learnings.jsonl");
    if (fs.existsSync(learningsPath)) {
      try {
        const content = fs.readFileSync(learningsPath, "utf-8").trim();
        const lines = content.split("\n").slice(-10);
        if (lines.length > 0) {
          sections.push(`## Recent Learnings`);
          for (const line of lines) {
            try {
              const learning = JSON.parse(line);
              sections.push(`- ${learning.text || learning}`);
            } catch { /* skip */ }
          }
          sections.push(``);
        }
      } catch { /* ignore */ }
    }
  }

  return sections.join("\n");
}
