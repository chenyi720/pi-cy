import { useState, useEffect, useCallback } from "react";
import { useChangeStore } from "../stores/changes";

interface FileEntry {
  name: string;
  isDir: boolean;
  path: string;
}

interface TreeNodeProps {
  entry: FileEntry;
  depth: number;
  onFileClick: (path: string) => void;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
}

function TreeNode({ entry, depth, onFileClick, expandedDirs, toggleDir }: TreeNodeProps) {
  const isExpanded = expandedDirs.has(entry.path);
  const indent = depth * 16;
  const { changedFiles } = useChangeStore();
  const isChanged = changedFiles.has(entry.path);

  if (entry.isDir) {
    return (
      <div>
        <button
          onClick={() => toggleDir(entry.path)}
          className="w-full flex items-center gap-1 px-2 py-0.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          style={{ paddingLeft: `${indent + 8}px` }}
        >
          <span className="text-xs w-4">{isExpanded ? "▼" : "▶"}</span>
          <span className="text-yellow-600 dark:text-yellow-400">📁</span>
          <span className="truncate">{entry.name}</span>
        </button>
        {isExpanded && <DirChildren dirPath={entry.path} depth={depth + 1} onFileClick={onFileClick} expandedDirs={expandedDirs} toggleDir={toggleDir} />}
      </div>
    );
  }

  const ext = entry.name.split(".").pop()?.toLowerCase() || "";
  const icon = getFileIcon(ext);

  return (
    <button
      onClick={() => onFileClick(entry.path)}
      className={`w-full flex items-center gap-1 px-2 py-0.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
        isChanged
          ? "text-orange-600 dark:text-orange-400 font-medium"
          : "text-gray-700 dark:text-gray-300"
      }`}
      style={{ paddingLeft: `${indent + 24}px` }}
    >
      <span>{icon}</span>
      <span className="truncate">{entry.name}</span>
      {isChanged && <span className="ml-auto text-[10px] text-orange-500 mr-2">●</span>}
    </button>
  );
}

function DirChildren({ dirPath, depth, onFileClick, expandedDirs, toggleDir }: { dirPath: string; depth: number; onFileClick: (p: string) => void; expandedDirs: Set<string>; toggleDir: (p: string) => void }) {
  const [children, setChildren] = useState<FileEntry[]>([]);

  useEffect(() => {
    fetch(`/api/files?path=${encodeURIComponent(dirPath)}`)
      .then((r) => r.json())
      .then((data: FileEntry[]) => {
        const sorted = data.sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setChildren(sorted);
      })
      .catch(() => setChildren([]));
  }, [dirPath]);

  return (
    <div>
      {children.map((child) => (
        <TreeNode key={child.path} entry={child} depth={depth} onFileClick={onFileClick} expandedDirs={expandedDirs} toggleDir={toggleDir} />
      ))}
    </div>
  );
}

interface FileTreeProps {
  rootPath: string;
  onFileClick: (path: string) => void;
}

export function FileTree({ rootPath, onFileClick }: FileTreeProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([rootPath]));

  useEffect(() => {
    fetch(`/api/files?path=${encodeURIComponent(rootPath)}`)
      .then((r) => r.json())
      .then((data: FileEntry[]) => {
        const sorted = data.sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setEntries(sorted);
      })
      .catch(() => setEntries([]));
  }, [rootPath]);

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  return (
    <div className="h-full overflow-y-auto text-sm">
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
        文件管理
      </div>
      {entries.map((entry) => (
        <TreeNode key={entry.path} entry={entry} depth={0} onFileClick={onFileClick} expandedDirs={expandedDirs} toggleDir={toggleDir} />
      ))}
    </div>
  );
}

function getFileIcon(ext: string): string {
  const icons: Record<string, string> = {
    ts: "📘", tsx: "📘", js: "📙", jsx: "📙", json: "📋",
    md: "📝", css: "🎨", html: "🌐", py: "🐍", rs: "🦀",
    go: "🔷", java: "☕", rb: "💎", sh: "⚙️", yml: "📋",
    yaml: "📋", toml: "📋", svg: "🖼️", png: "🖼️", jpg: "🖼️",
    ico: "🖼️", gitignore: "🙈", lock: "🔒",
  };
  return icons[ext] || "📄";
}
