export interface SkillDefinition {
  name: string;
  description: string;
  path: string;
  content: string;
  version?: string;
  preambleTier?: number;
  allowedTools?: string[];
  triggers?: string[];
  voiceTriggers?: string[];
  gbrain?: {
    schema: number;
    context_queries?: Array<{
      id: string;
      kind: string;
      filter?: Record<string, unknown>;
      sort?: string;
      limit?: number;
    }>;
  };
  arguments?: Record<string, {
    description: string;
    required?: boolean;
    default?: string;
  }>;
}
