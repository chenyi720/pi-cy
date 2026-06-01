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
  { key: "Ctrl+N", description: "新建会话" },
  { key: "Ctrl+B", description: "切换侧边栏" },
  { key: "Ctrl+Shift+F", description: "切换搜索" },
  { key: "Ctrl+G", description: "切换 Git 变更" },
  { key: "Ctrl+Shift+S", description: "切换历史会话" },
  { key: "Ctrl+L", description: "聚焦输入框" },
  { key: "Ctrl+Enter", description: "发送消息" },
];
