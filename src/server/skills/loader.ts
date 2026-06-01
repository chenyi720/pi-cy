import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { SkillDefinition } from "./types.js";

const loadedSkills = new Map<string, SkillDefinition>();

export function getLoadedSkills(): SkillDefinition[] {
  return Array.from(loadedSkills.values());
}

export function getSkill(name: string): SkillDefinition | undefined {
  return loadedSkills.get(name);
}

export function loadSkills(): void {
  const skillDirs = [
    path.join(process.cwd(), "skills"),
    path.join(os.homedir(), ".pi", "agent", "skills"),
  ];

  let count = 0;
  for (const dir of skillDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".md")) {
          const filePath = path.join(dir, entry.name);
          const skill = parseSkillFile(filePath);
          if (skill) {
            loadedSkills.set(skill.name, skill);
            count++;
          }
        }
      }
    } catch { /* ignore */ }
  }

  console.log(`[Skills] Loaded ${count} skill(s)`);
}

function parseSkillFile(filePath: string): SkillDefinition | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const name = path.basename(filePath, ".md");

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      return {
        name,
        description: name,
        path: filePath,
        content: content.trim(),
      };
    }

    const frontmatter = frontmatterMatch[1];
    const body = frontmatterMatch[2].trim();

    const meta: Record<string, string> = {};
    for (const line of frontmatter.split("\n")) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        meta[match[1]] = match[2].trim();
      }
    }

    return {
      name: meta.name || name,
      description: meta.description || meta.name || name,
      path: filePath,
      content: body,
      allowedTools: meta["allowed-tools"]?.split(",").map((t) => t.trim()),
    };
  } catch {
    return null;
  }
}

export function reloadSkills(): void {
  loadedSkills.clear();
  loadSkills();
}
