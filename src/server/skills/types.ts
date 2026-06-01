export interface SkillDefinition {
  name: string;
  description: string;
  path: string;
  content: string;
  allowedTools?: string[];
  arguments?: Record<string, {
    description: string;
    required?: boolean;
    default?: string;
  }>;
}
