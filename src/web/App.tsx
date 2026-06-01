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
import { loadChanges } from "./stores/changes";
import "./styles/themes.css";
import "highlight.js/styles/github-dark.css";

type SidebarTab = "files" | "search" | "git" | "sessions" | "image" | "terminal" | "skills" | "mcp" | "worktrees";

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
  const { errors, addError, dismissError } = useErrorHandler();

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
    } catch { /* ignore */ }
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

  const sidebarTabs: Array<{ id: SidebarTab; label: string }> = [
    { id: "files", label: "\u6587\u4ef6" },
    { id: "search", label: "\u641c\u7d22" },
    { id: "git", label: "Git" },
    { id: "sessions", label: "\u5386\u53f2" },
    { id: "image", label: "\u751f\u56fe" },
    { id: "terminal", label: "\u7ec8\u7aef" },
    { id: "skills", label: "\u6280\u80fd" },
    { id: "mcp", label: "MCP" },
    { id: "worktrees", label: "\u5de5\u4f5c\u533a" },
  ];

  return (
    <PermissionProvider>
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-white/30 dark:border-gray-700/30 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900 dark:text-white">PI-CY</span>
            <span className="text-[10px] text-gray-400">v0.1.0</span>
            <ModelSelector />

            {/* Session tabs */}
            <div className="flex ml-3 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
              {sessionTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center px-2 py-0.5 text-xs cursor-pointer ${
                    tab.id === activeTabId
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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
                      className="ml-1 text-[10px] opacity-60 hover:opacity-100"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleNewSession}
                className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="新建会话 (Ctrl+N)"
              >
                +
              </button>
            </div>

            {/* Sidebar tabs */}
            <div className="flex ml-2 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
              {sidebarTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (sidebarTab === t.id && sidebarVisible) {
                      setSidebarVisible(false);
                    } else {
                      setSidebarTab(t.id);
                      setSidebarVisible(true);
                    }
                  }}
                  className={`px-1.5 py-0.5 text-[10px] ${
                    sidebarTab === t.id && sidebarVisible
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ThemeToggle />
            <button
              onClick={() => setShowHelp((v) => !v)}
              className="hover:text-gray-600"
              title="快捷键 (Ctrl+/)"
            >
              快捷键
            </button>
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
            {connected ? "已连接" : "未连接"}
          </div>
        </div>

        {/* Help overlay */}
        {showHelp && (
          <div
            className="absolute top-10 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 w-64"
            onClick={() => setShowHelp(false)}
          >
            <div className="text-xs font-semibold text-gray-500 mb-2">快捷键</div>
            {KEYBINDINGS_HELP.map((h) => (
              <div key={h.key} className="flex justify-between py-0.5 text-xs">
                <span className="font-mono text-gray-600 dark:text-gray-300">{h.key}</span>
                <span className="text-gray-400">{h.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar */}
          {sidebarVisible && (
            <Sidebar side="left" defaultWidth={260}>
              {sidebarTab === "files" && (
                <FileTree rootPath={workspacePath} onFileClick={handleFileClick} />
              )}
              {sidebarTab === "search" && (
                <FileSearch rootPath={workspacePath} onResultClick={handleFileClick} />
              )}
              {sidebarTab === "git" && (
                <>
                  <GitChangesPanel onFileClick={handleFileClick} />
                  <ChangePanel onFileClick={handleFileClick} />
                </>
              )}
              {sidebarTab === "sessions" && (
                <SessionHistory
                  onLoadSession={handleLoadSession}
                  currentSessionPath={
                    sessionTabs.find((t) => t.id === activeTabId)?.sessionPath
                  }
                />
              )}
              {sidebarTab === "image" && (
                <ImageGenerator />
              )}
              {sidebarTab === "terminal" && (
                <TerminalPanel />
              )}
              {sidebarTab === "skills" && (
                <SkillManager />
              )}
              {sidebarTab === "mcp" && (
                <McpSettings />
              )}
              {sidebarTab === "worktrees" && (
                <GitWorktreePanel />
              )}
            </Sidebar>
          )}

          {/* Center: Chat */}
          <div className="flex-1 flex flex-col min-w-0">
            <ChatPanel />
            <ChatInput />
          </div>

          {/* Right: Editor */}
          {openFile && (
            <Sidebar side="right" defaultWidth={500}>
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <span className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate">
                    {fileName}
                  </span>
                  <button
                    onClick={() => setOpenFile(null)}
                    className="text-gray-400 hover:text-gray-600 text-xs ml-2"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1">
                  {fileLoading ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      加载中...
                    </div>
                  ) : (
                    <CodeEditor filePath={openFile.path} content={openFile.content} readOnly={false} />
                  )}
                </div>
              </div>
            </Sidebar>
          )}
        </div>

        {/* Status Bar */}
        <StatusBar />

        {/* Error Toasts */}
        <ErrorToast errors={errors} onDismiss={dismissError} />
      </div>
    </PermissionProvider>
  );
}
