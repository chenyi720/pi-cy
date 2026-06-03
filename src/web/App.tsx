import { useEffect, useRef, useState, useCallback } from "react";
import { connectWs, onWsMessage, startAgent, sendWs, sendChat } from "./api/ws";
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
  addUserMessage,
} from "./stores/chat";
import { ChatPanel } from "./components/ChatPanel";
import { ChatInput } from "./components/ChatInput";
import { FileTree } from "./components/FileTree";
import { CodeEditor } from "./components/Editor";
import { PermissionProvider, requestApproval } from "./components/PermissionDialog";
import { SessionHistory } from "./components/SessionHistory";
import { ThemeToggle } from "./components/ThemeToggle";
import { useErrorHandler, ErrorToast } from "./components/ErrorToast";
import { loadChanges } from "./stores/changes";
import "./styles/themes.css";
import "highlight.js/styles/github-dark.css";

/* ─── Types ─── */
interface SessionTab {
  id: string;
  name: string;
  sessionPath?: string;
}

type NavView = "chat" | "history" | "plans" | "files" | "settings";
type RightPanel = "files" | "changes" | null;

/* ─── Session group mock data (for sidebar) ─── */
interface SessionItem {
  id: string;
  title: string;
  dot: string;
  time: string;
  changes?: string;
  changesAgo?: string;
}

interface SessionGroup {
  label: string;
  items: SessionItem[];
}

const MOCK_SESSIONS: SessionGroup[] = [
  {
    label: "体育局相关",
    items: [
      {
        id: "s1",
        title: "学历证明PDF扫描件不完整",
        dot: "bg-blue-500",
        time: "8 小时前",
        changes: "+14 -14",
        changesAgo: "8 小时前",
      },
      {
        id: "s2",
        title: "Google 登录 EOF 网络问题排查",
        dot: "bg-slate-300",
        time: "4 天前",
        changes: "+14 -14",
        changesAgo: "4 天前",
      },
    ],
  },
  {
    label: "外墙幕墙拆除",
    items: [
      {
        id: "s3",
        title: "施工方案太简单了，搞复杂一点，报价...",
        dot: "bg-blue-500",
        time: "1 小时前",
      },
      { id: "s4", title: "武汉大学写字楼玻璃拆除方案", dot: "bg-blue-500", time: "8 小时前" },
    ],
  },
  {
    label: "OBSERVER-SESSIONS",
    items: [
      {
        id: "s5",
        title: "--- MODE SWITCH: PROGRESS SUMMA...",
        dot: "bg-slate-300",
        time: "33 分钟前",
      },
      {
        id: "s6",
        title: "--- MODE SWITCH: PROGRESS SUMMA...",
        dot: "bg-slate-300",
        time: "42 分钟前",
      },
      {
        id: "s7",
        title: "--- MODE SWITCH: PROGRESS SUMMA...",
        dot: "bg-slate-300",
        time: "57 分钟前",
      },
      {
        id: "s8",
        title: "--- MODE SWITCH: PROGRESS SUMMA...",
        dot: "bg-slate-300",
        time: "1 小时前",
      },
      {
        id: "s9",
        title: "--- MODE SWITCH: PROGRESS SUMMA...",
        dot: "bg-slate-300",
        time: "1 小时前",
      },
      {
        id: "s10",
        title: "--- MODE SWITCH: PROGRESS SUMMA...",
        dot: "bg-slate-300",
        time: "1 小时前",
      },
    ],
  },
];

/* ─── Custom section items ─── */
interface CustomItem {
  icon: string;
  label: string;
  count?: number;
}

const CUSTOM_ITEMS: CustomItem[] = [
  { icon: "🤖", label: "智能体" },
  { icon: "⚡", label: "技能", count: 10 },
  { icon: "📋", label: "指令", count: 1 },
  { icon: "🪝", label: "挂钩" },
  { icon: "🔌", label: "MCP 服务器", count: 5 },
];

/* ══════════════════════════════════════════════════════════
   APP
   ══════════════════════════════════════════════════════════ */
export default function App() {
  const assistantIdRef = useRef<string | null>(null);
  const streamContentRef = useRef("");
  const streamThinkingRef = useRef("");
  const [connected, setConnected] = useState(false);
  const [navView, setNavView] = useState<NavView>("chat");
  const [sidebarVisible] = useState(true);
  const [rightPanel, setRightPanel] = useState<RightPanel>("files");
  const [openFile, setOpenFile] = useState<{ path: string; content: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [sessionTabs, setSessionTabs] = useState<SessionTab[]>([
    { id: "default", name: "Session 1" },
  ]);
  const [activeTabId, setActiveTabId] = useState("default");
  const [workspacePath, setWorkspacePath] = useState("");
  const [chatStarted, setChatStarted] = useState(false);
  const [sidebarCollapsedGroups, setSidebarCollapsedGroups] = useState<Set<string>>(new Set());
  const [customExpanded, setCustomExpanded] = useState(true);
  const [rightTab, setRightTab] = useState<"files" | "changes">("files");

  const { errors, addError, dismissError } = useErrorHandler();

  useEffect(() => {
    const titles: Record<NavView, string> = {
      chat: "PI-CY",
      history: "PI-CY — 历史对话",
      plans: "PI-CY — 计划任务",
      files: "PI-CY — 文件浏览",
      settings: "PI-CY — 设置",
    };
    document.title = titles[navView] || "PI-CY";
  }, [navView]);

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
    setNavView("chat");
    setChatStarted(false);
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
        setNavView("chat");
        setChatStarted(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggleGroup = useCallback((label: string) => {
    setSidebarCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

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
          setChatStarted(true);
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

  const projectName = workspacePath.split(/[/\\]/).pop() || "PI_agent-CY";

  return (
    <PermissionProvider>
      <div className="app-root">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none"
        >
          跳转到主内容
        </a>

        {/* ═══ Window Title Bar (Tauri-style) ═══ */}
        <div className="window-titlebar" data-tauri-drag-region>
          <div className="titlebar-left">
            <button className="titlebar-nav-btn" title="后退">
              ←
            </button>
            <button className="titlebar-nav-btn" title="前进">
              →
            </button>
            <span className="titlebar-icon">✱</span>
            <span className="titlebar-project">你好 {projectName}</span>
            <span className="titlebar-sep">·</span>
            <span className="titlebar-branch">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                <line x1="6" y1="9" x2="6" y2="21" />
              </svg>
              main
            </span>
          </div>
          <div className="titlebar-right">
            <button className="titlebar-ctrl-btn" title="终端">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </button>
            <button className="titlebar-ctrl-btn" title="运行">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
            <button className="titlebar-ctrl-btn" title="下拉">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M2 3l3 3 3-3" />
              </svg>
            </button>
            <button className="titlebar-ctrl-btn" title="面板">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
            <button className="titlebar-ctrl-btn titlebar-settings" title="设置">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <div className="titlebar-divider" />
            <button className="titlebar-ctrl-btn" title="最小化">
              —
            </button>
            <button className="titlebar-ctrl-btn" title="最大化">
              □
            </button>
            <button className="titlebar-ctrl-btn titlebar-close" title="关闭">
              ✕
            </button>
          </div>
        </div>

        <div className="app-layout" id="main-content" tabIndex={-1}>
          {/* ═══ LEFT SIDEBAR ═══ */}
          {sidebarVisible && (
            <aside className="sidebar-left">
              <div className="sidebar-left-header">
                <span className="sidebar-left-title">会话</span>
                <div className="sidebar-left-actions">
                  <button
                    onClick={handleNewSession}
                    className="sidebar-new-btn"
                    title="新建对话 (Ctrl+N)"
                  >
                    新 <kbd>Ctrl+N</kbd>
                  </button>
                  <button className="sidebar-icon-btn" title="筛选">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                  </button>
                  <button className="sidebar-icon-btn" title="搜索">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="sidebar-left-scroll">
                {MOCK_SESSIONS.map((group) => (
                  <div key={group.label} className="session-group">
                    <button
                      className="session-group-header"
                      onClick={() => toggleGroup(group.label)}
                    >
                      <svg
                        className={`session-group-chevron ${sidebarCollapsedGroups.has(group.label) ? "collapsed" : ""}`}
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="currentColor"
                      >
                        <path d="M3 2l4 3-4 3V2z" />
                      </svg>
                      <span>{group.label}</span>
                    </button>
                    {!sidebarCollapsedGroups.has(group.label) && (
                      <div className="session-group-items">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            className={`session-item ${item.id === activeTabId ? "active" : ""}`}
                            onClick={() => {
                              setActiveTabId(item.id);
                              setNavView("chat");
                              setChatStarted(true);
                            }}
                          >
                            <span className={`session-dot ${item.dot}`} />
                            <div className="session-item-content">
                              <span className="session-item-title">{item.title}</span>
                              {item.changes && (
                                <span className="session-item-changes">
                                  <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                  </svg>
                                  {item.changes} · {item.changesAgo}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="sidebar-more-hint">+ 另外 152 个</div>

                <div className="sidebar-project-section">
                  <button className="session-group-header" onClick={() => setNavView("files")}>
                    <svg
                      className="session-group-chevron"
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="currentColor"
                    >
                      <path d="M3 2l4 3-4 3V2z" />
                    </svg>
                    <span className="sidebar-project-name">{projectName.toUpperCase()}</span>
                  </button>
                  {/* Active sessions under this project */}
                  <div className="session-group-items">
                    {chatStarted && (
                      <div className="session-item active">
                        <span className="session-dot bg-blue-500" />
                        <div className="session-item-content">
                          <span className="session-item-title">你好</span>
                          <span className="session-item-subtitle">
                            正在工作
                            <span className="pulse-dot" />
                            <span className="pulse-dot" />
                            <span className="pulse-dot" />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="sidebar-custom-section">
                  <button
                    className="sidebar-custom-header"
                    onClick={() => setCustomExpanded(!customExpanded)}
                  >
                    <span>自定义</span>
                    <svg
                      className={`session-group-chevron ${customExpanded ? "" : "collapsed"}`}
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="currentColor"
                    >
                      <path d="M3 2l4 3-4 3V2z" />
                    </svg>
                  </button>
                  {customExpanded && (
                    <div className="sidebar-custom-items">
                      {CUSTOM_ITEMS.map((item) => (
                        <button key={item.label} className="custom-item">
                          <span className="custom-item-icon">{item.icon}</span>
                          <span className="custom-item-label">{item.label}</span>
                          {item.count !== undefined && (
                            <span className="custom-item-count">{item.count}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar footer */}
              <div className="sidebar-left-footer">
                <ThemeToggle />
                <div className="sidebar-status-row">
                  <span
                    className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
                  />
                  <span className="text-[10px] text-slate-400">
                    {connected ? "已连接" : "未连接"}
                  </span>
                </div>
              </div>
            </aside>
          )}

          {/* ═══ CENTER MAIN ═══ */}
          <main className="center-main">
            {openFile ? (
              <div className="flex-1 flex flex-col h-full">
                <div className="editor-top-bar">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-blue-500 font-mono">📄</span>
                    <span className="text-xs font-mono text-slate-700 truncate">
                      {openFile.path.split(/[/\\]/).pop()}
                    </span>
                  </div>
                  <button onClick={() => setOpenFile(null)} className="editor-close-btn">
                    ✕
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  {fileLoading ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                      <span className="animate-spin mr-2">⏳</span> 加载中...
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
            ) : navView === "history" ? (
              <div className="flex-1 overflow-y-auto p-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                  历史对话
                </h2>
                <SessionHistory
                  onLoadSession={handleLoadSession}
                  currentSessionPath={sessionTabs.find((t) => t.id === activeTabId)?.sessionPath}
                />
              </div>
            ) : navView === "files" ? (
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    文件浏览
                  </span>
                </div>
                <FileTree rootPath={workspacePath} onFileClick={handleFileClick} />
              </div>
            ) : navView === "plans" ? (
              <div className="flex-1 overflow-y-auto p-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                  计划任务
                </h2>
                <p className="text-sm text-slate-500">计划功能开发中...</p>
              </div>
            ) : !chatStarted ? (
              /* ══ Welcome Screen ══ */
              /* ══ Welcome Screen ══ */
              <div className="welcome-screen">
                <div className="welcome-header">
                  <span className="welcome-loc-text">新会话位于</span>
                  <button className="welcome-badge" onClick={() => setRightPanel("files")}>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {projectName}
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" opacity="0.4">
                      <path d="M3 2l4 3-4 3V2z" />
                    </svg>
                  </button>
                  <span className="welcome-loc-text">使用</span>
                  <button className="welcome-badge">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                    Claude
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" opacity="0.4">
                      <path d="M3 2l4 3-4 3V2z" />
                    </svg>
                  </button>
                </div>

                <div className="welcome-input-area">
                  <div className="welcome-input-box">
                    <textarea
                      className="welcome-textarea"
                      placeholder="你今天要发布什么？"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          const target = e.target as HTMLTextAreaElement;
                          const val = target.value.trim();
                          if (val) {
                            addUserMessage(val);
                            sendChat(val);
                            target.value = "";
                            setChatStarted(true);
                          }
                        }
                      }}
                    />
                    <div className="welcome-input-footer">
                      <div className="welcome-input-left">
                        <button className="welcome-plus-btn" title="添加附件">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                        <div className="welcome-model-pill">
                          <span>Claude Haiku 4.5</span>
                        </div>
                      </div>
                      <button className="welcome-send-btn" title="发送" disabled>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="12" y1="19" x2="12" y2="5" />
                          <polyline points="5 12 12 5 19 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="welcome-auto-edit">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>自动编辑</span>
                  </div>
                </div>
              </div>
            ) : (
              /* ══ Active Chat ══ */
              <div className="chat-active-area">
                <ChatPanel />
                <ChatInput />
              </div>
            )}
          </main>

          {/* ═══ RIGHT PANEL ═══ */}
          {rightPanel && (
            <aside className="sidebar-right">
              <div className="right-panel-tabs">
                <button
                  className={`right-tab ${rightTab === "changes" ? "active" : ""}`}
                  onClick={() => setRightTab("changes")}
                >
                  更改
                </button>
                <button
                  className={`right-tab ${rightTab === "files" ? "active" : ""}`}
                  onClick={() => setRightTab("files")}
                >
                  文件
                </button>
                <div className="right-tab-actions">
                  <button className="sidebar-icon-btn" title="搜索文件">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </button>
                  <button className="sidebar-icon-btn" title="更多操作">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="right-panel-content">
                {rightTab === "files" ? (
                  <FileTree rootPath={workspacePath} onFileClick={handleFileClick} />
                ) : (
                  <div className="right-changes-empty">
                    <span className="text-xs text-slate-400">暂无更改</span>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>

        <ErrorToast errors={errors} onDismiss={dismissError} />
      </div>
    </PermissionProvider>
  );
}
