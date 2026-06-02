import { useState } from "react";

interface SidebarProps {
  children: React.ReactNode;
  side?: "left" | "right";
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function Sidebar({ children, side = "left", defaultWidth = 260, minWidth = 180, maxWidth = 500 }: SidebarProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = side === "left" ? ev.clientX - startX : startX - ev.clientX;
      setWidth(Math.min(maxWidth, Math.max(minWidth, startWidth + delta)));
    };

    const onMouseUp = () => {
      setResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-8 h-full flex items-center justify-center bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border-slate-200/50 dark:border-white/5 hover:bg-white/80 dark:hover:bg-zinc-800/80 transition-all duration-200 z-30"
        style={{ borderRight: side === "left" ? "1px solid" : undefined, borderLeft: side === "right" ? "1px solid" : undefined, borderColor: "var(--tw-border-color)" }}
      >
        <span className="text-slate-400 dark:text-slate-500 text-[10px]">{side === "left" ? "▶" : "◀"}</span>
      </button>
    );
  }

  return (
    <div
      className="relative flex shrink-0 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border-slate-200/50 dark:border-white/5 z-20"
      style={{
        width: `${width}px`,
        borderRight: side === "left" ? "1px solid" : undefined,
        borderLeft: side === "right" ? "1px solid" : undefined,
        borderColor: "var(--tw-border-color)",
      }}
    >
      <div className="flex-1 overflow-hidden">{children}</div>

      <button
        onClick={() => setCollapsed(true)}
        className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-white/80 dark:hover:text-slate-200 dark:hover:bg-zinc-700/80 text-[10px] transition-colors z-40"
      >
        {side === "left" ? "◀" : "▶"}
      </button>

      <div
        className={`absolute top-0 ${side === "left" ? "right-0" : "left-0"} w-1 h-full cursor-col-resize hover:bg-blue-500/50 ${resizing ? "bg-blue-500/50" : ""}`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
