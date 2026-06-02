import { useEffect, useRef } from "react";
import { useChatStore } from "../stores/chat";
import { Markdown } from "./Markdown";
import { ToolCallPanel } from "./ToolCallPanel";
import { ThinkingTimeline } from "./ThinkingTimeline";

const QUICK_AGENTS = [
  { name: "coder", icon: "💻", label: "写代码" },
  { name: "reviewer", icon: "🔍", label: "审代码" },
  { name: "debugger", icon: "🐛", label: "查 Bug" },
  { name: "researcher", icon: "📚", label: "调研" },
];

export function ChatPanel() {
  const { messages, isAgentRunning, error } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleQuickAgent = async (agentName: string) => {
    try {
      await fetch("/api/agents/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          definition: agentName,
          task: "等待任务...",
        }),
      });
    } catch { /* ignore */ }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 flex flex-col">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center space-y-3">
              <div className="text-5xl mb-3">🤖</div>
              <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                PI-CY 智能体
              </div>
              <div className="text-sm text-gray-500">由小米 MiMo 驱动</div>
              <div className="text-xs text-gray-400 mt-1">发送消息开始对话，或启动一个专属 Agent</div>

              {/* Quick Agent Buttons */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {QUICK_AGENTS.map((agent) => (
                  <button
                    key={agent.name}
                    onClick={() => handleQuickAgent(agent.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 text-xs text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 hover:shadow-md transition-all duration-200"
                  >
                    <span>{agent.icon}</span>
                    <span>{agent.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border border-blue-500/20 shadow-[0_4px_16px_rgba(37,99,235,0.2)]"
                  : msg.role === "system"
                    ? "bg-amber-50/80 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm border border-amber-200/40 backdrop-blur-sm"
                    : "bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/30 backdrop-blur-md text-slate-800 dark:text-slate-200 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"
              }`}
            >
              {msg.role === "user" ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
              ) : (
                <>
                  {msg.thinkingContent && (
                    <details className="mb-2 text-xs text-gray-400 group">
                      <summary className="cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span>思考过程</span>
                        <span className="text-[9px] opacity-50 ml-auto group-open:rotate-90 transition-transform">▶</span>
                      </summary>
                      <div className="mt-2 pl-3 border-l-2 border-blue-200 dark:border-blue-800 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 max-h-40 overflow-y-auto">
                        {msg.thinkingContent}
                      </div>
                    </details>
                  )}
                  <div className="text-sm leading-relaxed">
                    <Markdown content={msg.content} />
                  </div>
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <ToolCallPanel toolCalls={msg.toolCalls} />
                  )}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 bg-blue-500 animate-pulse ml-0.5 rounded-sm" />
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {isAgentRunning && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/30 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-gray-400">AI 正在思考...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/40 dark:border-red-800/30 rounded-2xl px-4 py-3 text-red-700 dark:text-red-300 text-sm shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
      <ThinkingTimeline />
    </div>
  );
}
