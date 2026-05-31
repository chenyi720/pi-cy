import { useEffect, useCallback } from "react";

interface KeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyBindings(bindings: KeyBinding[]) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      for (const binding of bindings) {
        const ctrlMatch = binding.ctrl ? e.ctrlKey || e.metaKey : !(e.ctrlKey || e.metaKey);
        const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = binding.alt ? e.altKey : !e.altKey;

        if (
          e.key.toLowerCase() === binding.key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          e.preventDefault();
          binding.action();
          return;
        }
      }
    },
    [bindings],
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}

export const KEYBINDINGS_HELP: Array<{ key: string; description: string }> = [
  { key: "Ctrl+N", description: "New session" },
  { key: "Ctrl+B", description: "Toggle sidebar" },
  { key: "Ctrl+Shift+F", description: "Toggle search" },
  { key: "Ctrl+G", description: "Toggle git changes" },
  { key: "Ctrl+Shift+S", description: "Toggle session history" },
  { key: "Ctrl+L", description: "Focus input" },
  { key: "Ctrl+Enter", description: "Send message" },
];
