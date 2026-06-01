import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  return (localStorage.getItem("pi-cy-theme") as Theme) || "system";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme("system");
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("pi-cy-theme", t);
  }, []);

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ["system", "light", "dark"];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  }, [theme, setTheme]);

  const resolved = theme === "system" ? getSystemTheme() : theme;

  return { theme, resolved, setTheme, cycleTheme };
}

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  const icons: Record<Theme, string> = { system: "💻", light: "☀️", dark: "🌙" };
  return (
    <button
      onClick={cycleTheme}
      className="text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1"
      title={`主题: ${theme === "system" ? "跟随系统" : theme === "light" ? "浅色" : "深色"}`}
    >
      {icons[theme]}
    </button>
  );
}
