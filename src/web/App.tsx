import { useEffect, useRef, useState, useCallback } from "react";
import { connectWs, onWsMessage, startAgent, sendWs } from "./api/ws";
import {
  addAssistantMessageStart,
  updateAssistantMessage,
  finalizeAssistantMessage,
  addToolCallStart,
  updateToolCallResult,
  setTokenUsage,
  setError,
  clearMessages,
  loadSessionMessages,
} from "./stores/chat";
import { ChatPanel } from "./components/ChatPanel";
import { ChatInput } from "./components/ChatInput";
import { StatusBar } from "./components/StatusBar";
import { FileTree } from "./components/FileTree";
import { CodeEditor } from "./components/Editor";
import { FileSearch } from "./components/FileSearch";
import { Sidebar } from "./components/Sidebar";
import { PermissionProvider, requestApproval } from "./components/PermissionDialog";
import { GitChangesPanel } from "./components/GitChangesPanel";
import { SessionHistory } from "./components/SessionHistory";
import { useKeyBindings, KEYBINDINGS_HELP } from "./components/KeyBindings";
import { ThemeToggle } from "./components/ThemeToggle";
import { useErrorHandler, ErrorToast } from "./components/ErrorToast";
import { ImageGenerator } from "./components/ImageGenerator";
import { ModelSelector } from "./components/ModelSelector";
import { TerminalPanel } from "./components/TerminalPanel";
import { ChangePanel } from "./components/ChangePanel";
import { SkillManager } from "./components/SkillManager";
import { McpSettings } from "./components/McpSettings";
import { GitWorktreePanel } from "./components/GitWorktreePanel";
import { PlanView } from "./components/PlanView";
import { AgentPanel } from "./components/AgentPanel";
import { TaskPanel } from "./components/TaskPanel";
import { HookManager } from "./components/HookManager";
import { WelcomeDashboard } from "./components/WelcomeDashboard";
import { loadChanges } from "./stores/changes";
import "./styles/themes.css";
import "highlight.js/styles/github-dark.css";

type SidebarTab = "files" | "search" | "git" | "sessions" | "image" | "skills" | "plans";

interface SessionTab {
  id: string;
  name: string;
  sessionPath?: string;
}

export default function App() {
  const assistantIdRef = useRef<string | null>(null);
  const streamContentRef = useRef("");
  const streamThinkingRef = useRef("");
  const [connected, setConnected] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("files");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [openFile, setOpenFile] = useState<{ path: string; content: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [sessionTabs, setSessionTabs] = useState<SessionTab[]>([
    { id: "default", name: "Session 1" },
  ]);
  const [activeTabId, setActiveTabId] = useState("default");
  const [workspacePath, setWorkspacePath] = useState("");

  // Bottom terminal states
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [terminalResizing, setTerminalResizing] = useState(false);

  // Sub-tabs in Left Sidebar
  const [orchestratorSubTab, setOrchestratorSubTab] = useState<
    "plans" | "agents" | "tasks" | "hooks"
  >("plans");
  const [skillsSubTab, setSkillsSubTab] = useState<"skills" | "mcp">("skills");

  const { errors, addError, dismissError } = useErrorHandler();

  // Dynamic page title based on active sidebar tab
  useEffect(() => {
    const titles: Record<SidebarTab, string> = {
      files: "PI-CY — 项目管理",
      search: "PI-CY — 全局搜索",
      git: "PI-CY — 源代码管理",
      sessions: "PI-CY — 历史会话",
      image: "PI-CY — ComfyUI 艺术画廊",
      skills: "PI-CY — 技能与 MCP",
      plans: "PI-CY — 协同编排",
    };
    document.title = sidebarVisible ? titles[sidebarTab] || "PI-CY" : "PI-CY";
  }, [sidebarTab, sidebarVisible]);

  useEffect(() => {
    loadChanges();
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        const cwd = data.settings?.lastWorkspace || process.cwd?.() || "";
        setWorkspacePath(cwd);
      })
      .catch(() => setWorkspacePath(""));
  }, []);

  const handleFileClick = useCallback(async (path: string) => {
    setFileLoading(true);
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setOpenFile({ path, content: data.content });
      }
    } catch {
      console.error("Failed to load file");
    } finally {
      setFileLoading(false);
    }
  }, []);

  const handleNewSession = useCallback(() => {
    const id = `session-${Date.now()}`;
    const num = sessionTabs.length + 1;
    setSessionTabs((prev) => [...prev, { id, name: `Session ${num}` }]);
    setActiveTabId(id);
    clearMessages();
    startAgent({
      provider: "xiaomi-token-plan-cn",
      model: "mimo-v2.5-pro",
      thinking: "medium",
      cwd: workspacePath,
    });
  }, [sessionTabs.length, workspacePath]);

  const handleLoadSession = useCallback(async (sessionPath: string) => {
    try {
      const res = await fetch(`/api/session-detail?path=${encodeURIComponent(sessionPath)}`);
      const data = await res.json();
      if (data.messages) {
        const id = `session-${Date.now()}`;
        const name = sessionPath.split(/[/\\]/).pop()?.replace(".jsonl", "") || "Session";
        setSessionTabs((prev) => [...prev, { id, name, sessionPath }]);
        setActiveTabId(id);
        loadSessionMessages(data.messages);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (sessionTabs.length <= 1) return;
      setSessionTabs((prev) => prev.filter((t) => t.id !== tabId));
      if (activeTabId === tabId) {
        setActiveTabId(sessionTabs.find((t) => t.id !== tabId)?.id || "default");
      }
    },
    [sessionTabs, activeTabId],
  );

  // Bottom terminal drag resizing
  const handleTerminalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setTerminalResizing(true);
    const startY = e.clientY;
    const startHeight = terminalHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setTerminalHeight(Math.min(500, Math.max(100, startHeight + delta)));
    };

    const onMouseUp = () => {
      setTerminalResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Keyboard shortcuts
  useKeyBindings([
    { key: "n", ctrl: true, action: handleNewSession, description: "New session" },
    {
      key: "b",
      ctrl: true,
      action: () => setSidebarVisible((v) => !v),
      description: "Toggle sidebar",
    },
    {
      key: "`",
      ctrl: true,
      action: () => setTerminalVisible((v) => !v),
      description: "Toggle terminal",
    },
    {
      key: "f",
      ctrl: true,
      shift: true,
      action: () => {
        setSidebarVisible(true);
        setSidebarTab("search");
      },
      description: "Toggle search",
    },
    {
      key: "g",
      ctrl: true,
      action: () => {
        setSidebarVisible(true);
        setSidebarTab("git");
      },
      description: "Toggle git changes",
    },
    {
      key: "s",
      ctrl: true,
      shift: true,
      action: () => {
        setSidebarVisible(true);
        setSidebarTab("sessions");
      },
      description: "Toggle sessions",
    },
    {
      key: "/",
      ctrl: true,
      action: () => setShowHelp((v) => !v),
      description: "Toggle help",
    },
  ]);

  // WebSocket connection
  useEffect(() => {
    connectWs();

    const unsub = onWsMessage((msg) => {
      const type = msg.type as string;
      switch (type) {
        case "connected": {
          setConnected(true);
          if (!msg.alive) {
            startAgent({
              provider: "xiaomi-token-plan-cn",
              model: "mimo-v2.5-pro",
              thinking: "medium",
              cwd: workspacePath,
            });
          }
          break;
        }
        case "message_start": {
          assistantIdRef.current = addAssistantMessageStart();
          streamContentRef.current = "";
          streamThinkingRef.current = "";
          break;
        }
        case "message_update": {
          if (!assistantIdRef.current) break;
          const delta = msg.delta as { type: string; text?: string }[] | undefined;
          if (delta) {
            for (const d of delta) {
              if (d.type === "text" && d.text) streamContentRef.current += d.text;
              if (d.type === "thinking" && d.text) streamThinkingRef.current += d.text;
            }
          }
          updateAssistantMessage(
            assistantIdRef.current,
            streamContentRef.current,
            streamThinkingRef.current || undefined,
          );
          break;
        }
        case "message_end": {
          if (assistantIdRef.current) {
            finalizeAssistantMessage(assistantIdRef.current);
            assistantIdRef.current = null;
          }
          if (msg.usage) {
            const usage = msg.usage as { input_tokens?: number; output_tokens?: number };
            setTokenUsage({
              input: usage.input_tokens || 0,
              output: usage.output_tokens || 0,
              total: (usage.input_tokens || 0) + (usage.output_tokens || 0),
            });
          }
          break;
        }
        case "tool_execution_start": {
          if (!assistantIdRef.current) break;
          addToolCallStart(
            assistantIdRef.current,
            (msg.tool_call_id as string) || `tool-${Date.now()}`,
            (msg.tool_name as string) || "unknown",
            msg.tool_arguments ? JSON.stringify(msg.tool_arguments) : "{}",
          );
          break;
        }
        case "tool_execution_end": {
          const toolId = msg.tool_call_id as string;
          if (toolId) {
            updateToolCallResult(
              toolId,
              (msg.result as string) || "",
              msg.is_error ? "error" : "success",
            );
          }
          break;
        }
        case "error": {
          const errMsg = (msg.msg || msg.message || "Unknown error") as string;
          setError(errMsg);
          addError(errMsg, "api", true);
          break;
        }
        case "exit":
          if (assistantIdRef.current) {
            finalizeAssistantMessage(assistantIdRef.current);
            assistantIdRef.current = null;
          }
          break;
        case "image_generated": {
          const imgPath = msg.imagePath as string;
          const seed = msg.seed as number;
          if (imgPath) {
            const id = addAssistantMessageStart();
            updateAssistantMessage(
              id,
              `![Generated Image](/api/comfyui/image?path=${encodeURIComponent(imgPath)})\n\nSeed: ${seed}`,
            );
            finalizeAssistantMessage(id);
          }
          break;
        }
        case "permission_request": {
          const toolId = (msg.tool_call_id as string) || `perm-${Date.now()}`;
          const toolName = (msg.tool_name as string) || "unknown";
          const toolArgs = msg.tool_arguments ? JSON.stringify(msg.tool_arguments) : "";
          const desc = msg.description as string | undefined;
          requestApproval(`${toolName} ${toolArgs}`.trim(), desc).then((approved) => {
            sendWs({ type: "permission_response", tool_call_id: toolId, approved });
          });
          break;
        }
      }
    });

    return unsub;
  }, [workspacePath, addError]);

  const fileName = openFile?.path.split(/[/\\]/).pop() || "";

  // Activity Bar Navigation Definition
  const activityTabs: Array<{ id: SidebarTab; label: string; tooltip: string }> = [
    { id: "files", label: "📁", tooltip: "文件浏览器" },
    { id: "search", label: "🔍", tooltip: "全局内容搜索" },
    { id: "git", label: "🌿", tooltip: "Git 源代码管理" },
    { id: "plans", label: "📋", tooltip: "计划编排与多智能体 Swarm" },
    { id: "skills", label: "⚡", tooltip: "沙盒技能与 MCP" },
    { id: "image", label: "🖼️", tooltip: "ComfyUI 艺术生图" },
    { id: "sessions", label: "📜", tooltip: "历史会话日志" },
  ];

  const handleActivityTabClick = (tabId: SidebarTab) => {
    if (sidebarTab === tabId && sidebarVisible) {
      setSidebarVisible(false);
    } else {
      setSidebarTab(tabId);
      setSidebarVisible(true);
    }
  };

  return (
    <PermissionProvider>
      <div
        className="h-screen flex flex-col bg-[#F9FAFB] dark:bg-[#09090B] text-slate-900 dark:text-slate-100 selection:bg-blue-500/30"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
      >
        {/* Skip navigation for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none"
        >
          跳转到主内容
        </a>

        {/* Global Top Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-white/70 dark:bg-[#09090B]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 shadow-sm z-40">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              PI-CY
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">v0.1.0</span>
            <span className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1" />
            <ModelSelector />

            {/* Session tabs */}
            <div className="flex ml-3 border border-gray-200/80 dark:border-gray-700/80 rounded overflow-hidden shadow-sm">
              {sessionTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center px-3 py-1 text-xs cursor-pointer transition-all duration-200 rounded-md ${
                    tab.id === activeTabId
                      ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 font-medium shadow-sm border border-slate-200/50 dark:border-white/10"
                      : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/5"
                  }`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <span className="max-w-[80px] truncate">{tab.name}</span>
                  {sessionTabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTab(tab.id);
                      }}
                      className="ml-1.5 text-[9px] opacity-60 hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleNewSession}
                className="px-2 py-0.5 text-xs bg-gray-100/60 dark:bg-gray-800/60 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"
                title="新建会话 (Ctrl+N)"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <ThemeToggle />
            <button
              onClick={() => setShowHelp((v) => !v)}
              className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="快捷键帮助 (Ctrl+/)"
            >
              快捷键
            </button>
            <span className="h-3 w-[1px] bg-gray-200 dark:bg-gray-700" />
            <span
              className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
            />
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              {connected ? "已连接" : "未连接"}
            </span>
          </div>
        </div>

        {/* Global Keyboard Shortcut Helper Overlay */}
        {showHelp && (
          <div
            className="absolute top-12 right-4 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 w-72 space-y-3"
            onClick={() => setShowHelp(false)}
          >
            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              键盘快捷键
            </div>
            <div className="space-y-1.5">
              {KEYBINDINGS_HELP.map((h) => (
                <div
                  key={h.key}
                  className="flex justify-between items-center py-0.5 text-xs border-b border-gray-100 dark:border-gray-800/50 last:border-0 pb-1"
                >
                  <span className="font-semibold text-gray-600 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-800 px-1 py-0.5 rounded border border-gray-200/55 dark:border-gray-700/50">
                    {h.key}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{h.description}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-0.5 text-xs">
                <span className="font-semibold text-gray-600 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-800 px-1 py-0.5 rounded border border-gray-200/55 dark:border-gray-700/50">
                  Ctrl + `
                </span>
                <span className="text-gray-500 dark:text-gray-400">折叠/展开底部终端</span>
              </div>
            </div>
          </div>
        )}

        {/* Body Viewport */}
        <div id="main-content" className="flex-1 flex overflow-hidden" tabIndex={-1}>
          {/* 1. Far-Left Activity Bar (48px) */}
          <div className="activity-bar">
            <div className="activity-btn-group">
              {activityTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleActivityTabClick(t.id)}
                  title={t.tooltip}
                  className={`activity-btn ${sidebarTab === t.id && sidebarVisible ? "active" : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 items-center mb-2">
              <button
                onClick={() => setTerminalVisible((v) => !v)}
                title="折叠/展开终端"
                className={`activity-btn ${terminalVisible ? "active" : ""}`}
              >
                💻
              </button>
            </div>
          </div>

          {/* 2. Left Collapsible resizable sidebar (250px) */}
          {sidebarVisible && (
            <Sidebar side="left" defaultWidth={260}>
              <div className="h-full flex flex-col overflow-hidden bg-white/50 dark:bg-zinc-900/30 backdrop-blur-2xl">
                {/* Sidebar Active Tab Title */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    {sidebarTab === "files"
                      ? "项目管理器"
                      : sidebarTab === "search"
                        ? "全局搜索"
                        : sidebarTab === "git"
                          ? "源代码管理"
                          : sidebarTab === "plans"
                            ? "协同编排画布"
                            : sidebarTab === "skills"
                              ? "开发者沙盒"
                              : sidebarTab === "image"
                                ? "ComfyUI 艺术画廊"
                                : "历史会话日志"}
                  </span>
                  <button
                    onClick={() => setSidebarVisible(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-[10px]"
                    title="收起侧边栏"
                  >
                    ◀
                  </button>
                </div>

                {/* Sidebar Inner Scroll Content */}
                <div className="flex-1 overflow-y-auto">
                  {sidebarTab === "files" && (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto min-h-0">
                        <FileTree rootPath={workspacePath} onFileClick={handleFileClick} />
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-800 p-2">
                        <GitWorktreePanel />
                      </div>
                    </div>
                  )}
                  {sidebarTab === "search" && (
                    <FileSearch rootPath={workspacePath} onResultClick={handleFileClick} />
                  )}
                  {sidebarTab === "git" && (
                    <div className="flex flex-col gap-2 p-2">
                      <GitChangesPanel onFileClick={handleFileClick} />
                      <ChangePanel onFileClick={handleFileClick} />
                      <GitWorktreePanel />
                    </div>
                  )}
                  {sidebarTab === "sessions" && (
                    <SessionHistory
                      onLoadSession={handleLoadSession}
                      currentSessionPath={
                        sessionTabs.find((t) => t.id === activeTabId)?.sessionPath
                      }
                    />
                  )}
                  {sidebarTab === "image" && <ImageGenerator />}

                  {/* Skills Sub-Tab container */}
                  {sidebarTab === "skills" && (
                    <div className="h-full flex flex-col">
                      <div className="flex border-b border-gray-200 dark:border-gray-800 p-1.5 gap-1 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
                        <button
                          onClick={() => setSkillsSubTab("skills")}
                          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                            skillsSubTab === "skills"
                              ? "bg-blue-600 text-white shadow-sm"
                              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/40 dark:hover:bg-gray-800/40"
                          }`}
                        >
                          自定义技能
                        </button>
                        <button
                          onClick={() => setSkillsSubTab("mcp")}
                          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                            skillsSubTab === "mcp"
                              ? "bg-blue-600 text-white shadow-sm"
                              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/40 dark:hover:bg-gray-800/40"
                          }`}
                        >
                          MCP 服务
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto min-h-0">
                        {skillsSubTab === "skills" ? <SkillManager /> : <McpSettings />}
                      </div>
                    </div>
                  )}

                  {/* Plan / Swarm Sub-Tab container */}
                  {sidebarTab === "plans" && (
                    <div className="h-full flex flex-col">
                      <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-800 p-1 gap-0.5 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
                        {(["plans", "agents", "tasks", "hooks"] as const).map((sub) => (
                          <button
                            key={sub}
                            onClick={() => setOrchestratorSubTab(sub)}
                            className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition-all capitalize truncate ${
                              orchestratorSubTab === sub
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/40 dark:hover:bg-gray-800/40"
                            }`}
                            title={sub}
                          >
                            {sub === "plans"
                              ? "计划"
                              : sub === "agents"
                                ? "协同"
                                : sub === "tasks"
                                  ? "清单"
                                  : "事件"}
                          </button>
                        ))}
                      </div>
                      <div className="flex-1 overflow-y-auto min-h-0">
                        {orchestratorSubTab === "plans" && <PlanView />}
                        {orchestratorSubTab === "agents" && <AgentPanel />}
                        {orchestratorSubTab === "tasks" && <TaskPanel />}
                        {orchestratorSubTab === "hooks" && <HookManager />}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Sidebar>
          )}

          {/* 3. Center Workspace Area (Monaco Editor & Collapsible terminal) */}
          <div className="flex-1 flex flex-col min-w-0 bg-white/60 dark:bg-[#09090B]/60 backdrop-blur-md relative shadow-[-4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[-4px_0_24px_rgba(0,0,0,0.2)] z-10">
            {/* Editor viewport or Welcome dashboard */}
            <div className="flex-1 flex flex-col relative min-h-0 overflow-hidden">
              {openFile ? (
                <div className="h-full flex flex-col">
                  {/* File Tab Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-blue-500 dark:text-blue-400 font-mono select-none">
                        📄
                      </span>
                      <span className="text-xs font-mono text-gray-700 dark:text-gray-200 truncate select-all">
                        {fileName}
                      </span>
                    </div>
                    <button
                      onClick={() => setOpenFile(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs ml-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 w-5 h-5 rounded flex items-center justify-center transition-colors"
                      title="关闭编辑器"
                    >
                      ✕
                    </button>
                  </div>
                  {/* Code Editor block */}
                  <div className="flex-1 min-h-0 relative">
                    {fileLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm bg-white/60 dark:bg-gray-950/60">
                        <span className="animate-spin mr-2">⏳</span> 加载源码中...
                      </div>
                    ) : (
                      <CodeEditor
                        filePath={openFile.path}
                        content={openFile.content}
                        readOnly={false}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <WelcomeDashboard
                  workspacePath={workspacePath}
                  onTabSelect={(tab, subTab) => {
                    setSidebarTab(tab);
                    setSidebarVisible(true);
                    if (tab === "plans" && subTab) {
                      setOrchestratorSubTab(subTab as any);
                    }
                    if (tab === "skills" && subTab) {
                      setSkillsSubTab(subTab as any);
                    }
                  }}
                  onNewSession={handleNewSession}
                  toggleHelp={() => setShowHelp((v) => !v)}
                  toggleTerminal={() => setTerminalVisible((v) => !v)}
                />
              )}
            </div>

            {/* Collapsible Bottom Terminal */}
            {terminalVisible && (
              <div className="bottom-terminal-container" style={{ height: `${terminalHeight}px` }}>
                {/* Resizing mouse handle */}
                <div
                  className={`bottom-terminal-resizer ${terminalResizing ? "active" : ""}`}
                  onMouseDown={handleTerminalMouseDown}
                />

                {/* Terminal Header */}
                <div className="flex items-center justify-between px-3 py-1 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-150 dark:border-gray-800 select-none">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    SYSTEM SHELL TERMINAL
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTerminalHeight(220)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-[10px] px-1 hover:bg-gray-200/50 dark:hover:bg-gray-850"
                      title="重置高度"
                    >
                      ⟲
                    </button>
                    <button
                      onClick={() => setTerminalVisible(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold leading-none hover:bg-gray-200/50 dark:hover:bg-gray-850 w-4 h-4 rounded flex items-center justify-center"
                      title="收起终端"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative min-h-0 overflow-hidden bg-gray-950">
                  <TerminalPanel />
                </div>
              </div>
            )}
          </div>

          {/* 4. Right Collapsible resizable AI Chat sidebar (380px) */}
          <Sidebar side="right" defaultWidth={380} minWidth={280} maxWidth={600}>
            <div className="h-full flex flex-col bg-white/70 dark:bg-zinc-900/50 backdrop-blur-2xl shadow-[-8px_0_32px_rgba(0,0,0,0.03)] dark:shadow-[-8px_0_32px_rgba(0,0,0,0.2)] z-20">
              {/* Chat Titlebar Header inside Sidebar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 select-none">
                <span className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  AI 智能体助手
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                    {connected ? "在线就绪" : "断开连接"}
                  </span>
                </div>
              </div>

              {/* Chat Content & Input Panels */}
              <ChatPanel />
              <ChatInput />
            </div>
          </Sidebar>
        </div>

        {/* Global bottom Status Bar */}
        <StatusBar />

        {/* Global Toast Error Notifications */}
        <ErrorToast errors={errors} onDismiss={dismissError} />
      </div>
    </PermissionProvider>
  );
}
