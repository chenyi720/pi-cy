import fs from "node:fs";
import path from "node:path";
import type { SkillDefinition } from "./types.js";
import { getSkill, getLoadedSkills } from "./loader.js";
import { generatePreamble, generatePreambleContext } from "./preamble.js";

export function formatSkillForPrompt(skill: SkillDefinition, projectDir?: string): string {
  const sections: string[] = [];

  sections.push(`# Skill: ${skill.name}`);
  sections.push(``);
  sections.push(skill.description);
  sections.push(``);

  if (skill.version) {
    sections.push(`Version: ${skill.version}`);
  }

  if (skill.preambleTier && projectDir) {
    const ctx = generatePreambleContext(projectDir);
    const preamble = generatePreamble(skill.preambleTier, ctx);
    sections.push(preamble);
  }

  if (skill.allowedTools && skill.allowedTools.length > 0) {
    sections.push(`## Allowed Tools`);
    sections.push(skill.allowedTools.join(", "));
    sections.push(``);
  }

  const modelOverlayPath = path.join(process.cwd(), "skills", "model-overlays", "mimo-v2.5-pro.md");
  if (fs.existsSync(modelOverlayPath)) {
    try {
      const overlay = fs.readFileSync(modelOverlayPath, "utf-8").trim();
      sections.push(overlay);
      sections.push(``);
    } catch { /* ignore */ }
  }

  sections.push(`## Skill Instructions`);
  sections.push(``);
  sections.push(skill.content);

  return sections.join("\n");
}

export function getActiveSkills(): SkillDefinition[] {
  return getLoadedSkills();
}

export function invokeSkill(name: string, args?: Record<string, string>): string | null {
  const skill = getSkill(name);
  if (!skill) return null;

  let content = formatSkillForPrompt(skill, process.cwd());

  if (args) {
    for (const [key, value] of Object.entries(args)) {
      content = content.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
    }
  }

  return content;
}
