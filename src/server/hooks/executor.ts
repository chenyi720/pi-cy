import { execSync } from "node:child_process";
import type { HookDefinition, HookEvent } from "./types.js";

const hooks = new Map<string, HookDefinition>();

export function registerHook(hook: HookDefinition): void {
  hooks.set(hook.name, hook);
}

export function getHooksForEvent(event: HookEvent): HookDefinition[] {
  return Array.from(hooks.values()).filter(
    (h) => h.event === event && h.enabled !== false,
  );
}

export function getAllHooks(): HookDefinition[] {
  return Array.from(hooks.values());
}

export function removeHook(name: string): boolean {
  return hooks.delete(name);
}

export async function executeHooks(
  event: HookEvent,
  context: Record<string, string>,
): Promise<string[]> {
  const eventHooks = getHooksForEvent(event);
  const results: string[] = [];

  for (const hook of eventHooks) {
    try {
      let cmd = hook.command;
      for (const [key, value] of Object.entries(context)) {
        cmd = cmd.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
      }

      const output = execSync(cmd, {
        encoding: "utf-8",
        timeout: 30000,
        windowsHide: true,
        shell: true,
      });

      if (output.trim()) {
        results.push(`[${hook.name}] ${output.trim()}`);
      }
    } catch (e) {
      results.push(`[${hook.name}] Error: ${(e as Error).message}`);
    }
  }

  return results;
}

registerHook({
  name: "lint-on-save",
  event: "on-save",
  command: "npm run lint --if-present",
  description: "Run linter when files are saved",
  enabled: true,
});

registerHook({
  name: "typecheck-on-save",
  event: "on-save",
  command: "npx tsc --noEmit 2>&1 | head -20",
  description: "Run type checker when files are saved",
  enabled: false,
});
