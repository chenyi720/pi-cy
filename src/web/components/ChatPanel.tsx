import { useEffect, useRef } from "react";
import { useChatStore } from "../stores/chat";
import { Markdown } from "./Markdown";
import { ToolCallPanel } from "./ToolCallPanel";
import { ThinkingTimeline } from "./ThinkingTimeline";

export function ChatPanel() {
  const { messages, isAgentRunning, error } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 flex flex-col">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">🤖</div>
              <div className="text-lg font-medium">PI-CY</div>
              <div className="text-sm">由小米 MiMo 驱动</div>
              <div className="text-xs mt-2">发送消息开始对话</div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-[20px] px-4 py-3.5 shadow-sm transition-all duration-300 relative group overflow-hidden ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border border-blue-500/30 shadow-[0_4px_16px_rgba(37,99,235,0.2)] rounded-br-sm"
                  : msg.role === "system"
                    ? "bg-amber-50/90 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs border border-amber-200/40 dark:border-amber-700/30 backdrop-blur-md rounded-bl-sm"
                    : "bg-white/95 dark:bg-[#1E1E24]/90 border border-black/[0.04] dark:border-white/[0.04] backdrop-blur-xl text-slate-800 dark:text-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-bl-sm"
              }`}
            >
              {msg.role === "user" ? (
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed font-medium">{msg.content}</div>
              ) : (
                <>
                  {msg.thinkingContent && (
                    <details className="mb-2 text-xs text-gray-400">
                      <summary className="cursor-pointer hover:text-gray-600">
                        思考中...
                      </summary>
                      <div className="mt-1 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                        {msg.thinkingContent}
                      </div>
                    </details>
                  )}
                  <Markdown content={msg.content} />
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <ToolCallPanel toolCalls={msg.toolCalls} />
                  )}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {isAgentRunning && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <span className="animate-spin">⏳</span>
                <span>思考中...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
      <ThinkingTimeline />
    </div>
  );
}
