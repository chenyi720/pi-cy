import { useEffect, useRef } from "react";
import { useChatStore } from "../stores/chat";
import { Markdown } from "./Markdown";
import { ToolCallPanel } from "./ToolCallPanel";

export function ChatPanel() {
  const { messages, isAgentRunning, error } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">🤖</div>
            <div className="text-lg font-medium">PI-CY</div>
            <div className="text-sm">Powered by Xiaomi MiMo</div>
            <div className="text-xs mt-2">Send a message to start</div>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-lg px-4 py-3 ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : msg.role === "system"
                  ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}
          >
            {msg.role === "user" ? (
              <div className="whitespace-pre-wrap">{msg.content}</div>
            ) : (
              <>
                {msg.thinkingContent && (
                  <details className="mb-2 text-xs text-gray-400">
                    <summary className="cursor-pointer hover:text-gray-600">
                      Thinking...
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
              <span>Thinking...</span>
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
  );
}
