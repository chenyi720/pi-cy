import type { SkillDefinition } from "./types.js";
import { getSkill, getLoadedSkills } from "./loader.js";

export function formatSkillForPrompt(skill: SkillDefinition): string {
  return `## Skill: ${skill.name}\n\n${skill.description}\n\n${skill.content}`;
}

export function getActiveSkills(): SkillDefinition[] {
  return getLoadedSkills();
}

export function invokeSkill(name: string, args?: Record<string, string>): string | null {
  const skill = getSkill(name);
  if (!skill) return null;

  let content = skill.content;
  if (args) {
    for (const [key, value] of Object.entries(args)) {
      content = content.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
    }
  }

  return content;
}
