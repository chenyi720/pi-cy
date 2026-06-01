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
    path.join(os.homedir(), ".claude", "skills"),
  ];

  let count = 0;
  for (const dir of skillDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
          const filePath = path.join(dir, entry.name);
          const skill = parseSkillFile(filePath);
          if (skill) {
            loadedSkills.set(skill.name, skill);
            count++;
          }
        } else if (entry.isDirectory()) {
          const skillMd = path.join(dir, entry.name, "SKILL.md");
          if (fs.existsSync(skillMd)) {
            const skill = parseSkillFile(skillMd);
            if (skill) {
              loadedSkills.set(skill.name, skill);
              count++;
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  console.log(`[Skills] Loaded ${count} skill(s)`);
}

function parseYamlFrontmatter(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!match) { i++; continue; }

    const key = match[1];
    let value = match[2].trim();

    if (value === "|" || value === ">") {
      const multiline: string[] = [];
      i++;
      while (i < lines.length && (lines[i].startsWith("  ") || lines[i].startsWith("\t") || lines[i].trim() === "")) {
        multiline.push(lines[i].replace(/^  /, ""));
        i++;
      }
      result[key] = multiline.join("\n").trim();
      continue;
    }

    if (value === "" || value === undefined) {
      const arrayItems: string[] = [];
      i++;
      while (i < lines.length && lines[i].match(/^\s+-\s+/)) {
        const itemMatch = lines[i].match(/^\s+-\s+(.+)$/);
        if (itemMatch) {
          arrayItems.push(itemMatch[1].replace(/^["']|["']$/g, "").trim());
        }
        i++;
      }
      if (arrayItems.length > 0) {
        result[key] = arrayItems;
        continue;
      }
      result[key] = "";
      continue;
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    } else if (value === "true") {
      result[key] = true;
    } else if (value === "false") {
      result[key] = false;
    } else if (/^\d+$/.test(value)) {
      result[key] = parseInt(value, 10);
    } else {
      result[key] = value.replace(/^["']|["']$/g, "");
    }

    i++;
  }

  return result;
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

    const meta = parseYamlFrontmatter(frontmatterMatch[1]);
    const body = frontmatterMatch[2].trim();

    const allowedTools = Array.isArray(meta["allowed-tools"])
      ? meta["allowed-tools"] as string[]
      : typeof meta["allowed-tools"] === "string"
        ? (meta["allowed-tools"] as string).split(",").map((t: string) => t.trim())
        : undefined;

    const triggers = Array.isArray(meta.triggers)
      ? meta.triggers as string[]
      : undefined;

    const voiceTriggers = Array.isArray(meta["voice-triggers"])
      ? meta["voice-triggers"] as string[]
      : undefined;

    return {
      name: (meta.name as string) || name,
      description: (meta.description as string) || (meta.name as string) || name,
      path: filePath,
      content: body,
      version: meta.version as string | undefined,
      preambleTier: typeof meta["preamble-tier"] === "number" ? meta["preamble-tier"] as number : undefined,
      allowedTools,
      triggers,
      voiceTriggers,
    };
  } catch {
    return null;
  }
}

export function reloadSkills(): void {
  loadedSkills.clear();
  loadSkills();
}

export function findSkillByTrigger(input: string): SkillDefinition | undefined {
  const lower = input.toLowerCase();
  for (const skill of loadedSkills.values()) {
    if (skill.triggers) {
      for (const trigger of skill.triggers) {
        if (lower.includes(trigger.toLowerCase())) {
          return skill;
        }
      }
    }
  }
  return undefined;
}
