import { useState, useEffect, useRef } from "react";
import { onWsMessage } from "../api/ws.js";

interface TimelineEvent {
  id: string;
  type: "thinking" | "tool_call" | "message";
  label: string;
  status: "running" | "success" | "error";
  timestamp: number;
  duration?: number;
  details?: string;
}

export function ThinkingTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  useEffect(() => {
    const unsubscribe = onWsMessage((msg) => {
      if (msg.type === "message_start") {
        setEvents([
          {
            id: "thinking-start",
            type: "thinking",
            label: "思考与方案规划中...",
            status: "running",
            timestamp: Date.now(),
          },
        ]);
      } else if (msg.type === "tool_execution_start") {
        const callId = (msg.tool_call_id as string) || `tool-${Date.now()}`;
        setEvents((prev) => {
          // Complete previous thinking
          const updated = prev.map((e) =>
            e.id === "thinking-start" && e.status === "running"
              ? { ...e, status: "success" as const, duration: Date.now() - e.timestamp }
              : e
          );
          return [
            ...updated,
            {
              id: callId,
              type: "tool_call",
              label: `执行本地工具: ${msg.tool_name}`,
              status: "running",
              timestamp: Date.now(),
              details: msg.tool_arguments ? JSON.stringify(msg.tool_arguments, null, 2) : "",
            },
          ];
        });
      } else if (msg.type === "tool_execution_end") {
        const callId = (msg.tool_call_id as string) || "";
        setEvents((prev) =>
          prev.map((e) => {
            if (e.type === "tool_call" && (e.id === callId || (callId === "" && e.status === "running"))) {
              return {
                ...e,
                status: msg.status === "success" ? ("success" as const) : ("error" as const),
                duration: Date.now() - e.timestamp,
                details: e.details + `\n\n[执行结果]\n${String(msg.result || "").slice(0, 500)}${String(msg.result || "").length > 500 ? "..." : ""}`,
              };
            }
            return e;
          })
        );
      } else if (msg.type === "message_end") {
        setEvents((prev) => {
          const updated = prev.map((e) =>
            e.status === "running"
              ? { ...e, status: "success" as const, duration: Date.now() - e.timestamp }
              : e
          );
          return [
            ...updated,
            {
              id: "thinking-end",
              type: "message",
              label: "回答生成完毕",
              status: "success",
              timestamp: Date.now(),
            },
          ];
        });
      }
    });

    return () => unsubscribe();
  }, []);

  if (!isOpen) {
    return (
      <div className="h-9 border-t border-gray-200/50 dark:border-white/5 bg-gray-50/40 dark:bg-[#1E1E24]/60 backdrop-blur-md flex items-center justify-between px-4 shrink-0 transition-all select-none hover:bg-gray-100/50 dark:hover:bg-white/5">
        <button
          onClick={() => setIsOpen(true)}
          className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1.5 cursor-pointer"
        >
          <span className={`${events.some(e => e.status === "running") ? "animate-spin text-blue-500" : ""}`}>⚙</span>
          <span>AI 思考路径 ({events.length} 节点)</span>
        </button>
        <button
          onClick={() => setIsOpen(true)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs transition-transform hover:-translate-y-0.5"
          title="展开面板"
        >
          ▲
        </button>
      </div>
    );
  }

  return (
    <div className="h-56 border-t border-gray-200/50 dark:border-white/5 bg-white/70 dark:bg-[#18181D]/80 backdrop-blur-xl flex flex-col shrink-0 transition-all duration-300 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
      {/* Title bar */}
      <div className="px-4 py-2 border-b border-gray-150/50 dark:border-white/5 flex items-center justify-between bg-gray-50/30 dark:bg-black/20 select-none">
        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className={`${events.some(e => e.status === "running") ? "animate-spin text-blue-500" : ""}`}>⚙</span>
          <span>AI 思考与工具时间轴</span>
        </span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs cursor-pointer transition-transform hover:translate-y-0.5"
          title="折叠面板"
        >
          ▼
        </button>
      </div>

      {/* Events Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {events.length === 0 ? (
          <div className="text-center text-[10px] text-gray-450 dark:text-gray-500 py-6">
            等待发送消息以追踪 AI 工具执行链...
          </div>
        ) : (
          <div className="relative pl-3 border-l border-slate-200 dark:border-gray-850 space-y-2.5">
            {events.map((e, index) => {
              const isRunning = e.status === "running";
              const isError = e.status === "error";
              const dotColor = isRunning
                ? "bg-blue-500 ring-2 ring-blue-500/20"
                : isError
                  ? "bg-red-500"
                  : "bg-green-500";

              return (
                <div key={e.id + index} className="relative group text-[11.5px] animate-fade-in">
                  {/* Pulse Dot */}
                  <span className={`absolute -left-[17px] top-1 w-1.5 h-1.5 rounded-full transition-all ${dotColor} ${isRunning ? "animate-pulse" : ""}`} />

                  {/* Header info */}
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${isRunning ? "text-blue-600 dark:text-blue-400" : isError ? "text-red-500" : "text-gray-700 dark:text-gray-300"}`}>
                      {e.label}
                    </span>
                    {e.duration !== undefined && (
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono">
                        {(e.duration / 1000).toFixed(2)}s
                      </span>
                    )}
                  </div>

                  {/* Event details */}
                  {e.details && (
                    <details className="mt-0.5 cursor-pointer">
                      <summary className="text-[9px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 outline-none">
                        详情日志
                      </summary>
                      <pre className="mt-1 p-1.5 rounded bg-gray-950 text-[8.5px] font-mono text-green-400 border border-gray-900 max-h-24 overflow-y-auto whitespace-pre-wrap leading-normal shadow-inner select-all">
                        {e.details}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
