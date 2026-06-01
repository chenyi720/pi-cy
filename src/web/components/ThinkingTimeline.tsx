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
      <div className="w-[40px] border-l border-white/30 dark:border-gray-750 bg-white/20 dark:bg-gray-850/20 flex flex-col items-center pt-4 transition-all">
        <button
          onClick={() => setIsOpen(true)}
          className="text-xs text-gray-500 hover:text-blue-500 font-bold transform rotate-90 origin-left translate-x-2.5 whitespace-nowrap"
          title="展开思考日志"
        >
          ⚙ 思考路径 ➔
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 border-l border-white/30 dark:border-gray-750 bg-white/30 dark:bg-gray-850/20 flex flex-col h-full overflow-hidden transition-all duration-300">
      {/* Title bar */}
      <div className="px-3 py-2 border-b border-white/30 dark:border-gray-750 flex items-center justify-between bg-white/40 dark:bg-gray-850/40">
        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          AI 思考路径时间轴
        </span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
          title="折叠时间轴"
        >
          ⇥
        </button>
      </div>

      {/* Events Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {events.length === 0 ? (
          <div className="text-center text-[10px] text-gray-400 dark:text-gray-500 py-12">
            等待您发送消息以追踪 AI 工具执行链路...
          </div>
        ) : (
          <div className="relative pl-4 border-l-2 border-slate-200 dark:border-gray-800 space-y-4">
            {events.map((e, index) => {
              const isRunning = e.status === "running";
              const isError = e.status === "error";
              const dotColor = isRunning
                ? "bg-blue-500 ring-4 ring-blue-500/20"
                : isError
                  ? "bg-red-500"
                  : "bg-green-500";

              return (
                <div key={e.id + index} className="relative group text-[11px] animate-fade-in">
                  {/* Pulse Dot */}
                  <span className={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full transition-all ${dotColor} ${isRunning ? "animate-pulse" : ""}`} />

                  {/* Header info */}
                  <div className="flex justify-between items-center font-semibold">
                    <span className={isRunning ? "text-blue-600 dark:text-blue-400" : isError ? "text-red-500" : "text-gray-700 dark:text-gray-300"}>
                      {e.label}
                    </span>
                    {e.duration !== undefined && (
                      <span className="text-[8px] text-gray-400 dark:text-gray-500">
                        {(e.duration / 1000).toFixed(2)}s
                      </span>
                    )}
                  </div>

                  {/* Event details */}
                  {e.details && (
                    <details className="mt-1 cursor-pointer">
                      <summary className="text-[9px] text-gray-450 hover:text-gray-600 dark:hover:text-gray-300 outline-none">
                        展开输入与执行日志
                      </summary>
                      <pre className="mt-1.5 p-2 rounded-lg bg-gray-950 text-[8.5px] font-mono text-green-400 border border-gray-900 max-h-40 overflow-y-auto whitespace-pre-wrap leading-normal shadow-inner select-all">
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
