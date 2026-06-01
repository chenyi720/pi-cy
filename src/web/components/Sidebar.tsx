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
        className="w-8 h-full flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border-white/30 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200"
        style={{ borderRight: side === "left" ? "1px solid" : undefined, borderLeft: side === "right" ? "1px solid" : undefined, borderColor: "inherit" }}
      >
        <span className="text-gray-400 text-xs">{side === "left" ? "▶" : "◀"}</span>
      </button>
    );
  }

  return (
    <div
      className="relative flex shrink-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-white/40 dark:border-gray-700/40"
      style={{
        width: `${width}px`,
        borderRight: side === "left" ? "1px solid" : undefined,
        borderLeft: side === "right" ? "1px solid" : undefined,
        borderColor: "rgba(255,255,255,0.3)",
        boxShadow: "0 4px 30px rgba(0,0,0,0.05)",
      }}
    >
      <div className="flex-1 overflow-hidden">{children}</div>

      <button
        onClick={() => setCollapsed(true)}
        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-white/50 dark:hover:bg-gray-800/50 text-xs transition-colors"
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
