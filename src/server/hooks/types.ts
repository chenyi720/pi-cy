export type HookEvent = "pre-commit" | "post-edit" | "on-error" | "on-start" | "on-save";

export interface HookDefinition {
  name: string;
  event: HookEvent;
  command: string;
  description?: string;
  enabled?: boolean;
}
