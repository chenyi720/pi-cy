import { useChatStore } from "../stores/chat";

export function StatusBar() {
  const { currentModel, currentProvider, tokenUsage, isAgentRunning } =
    useChatStore();

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border-t border-white/30 dark:border-gray-700/30 text-xs text-gray-500 dark:text-gray-400">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${isAgentRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
          />
          {isAgentRunning ? "运行中" : "空闲"}
        </span>
        <span className="font-mono">
          {currentProvider}/{currentModel}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {tokenUsage && (
          <>
            <span>
              输入: {tokenUsage.input.toLocaleString()}
            </span>
            <span>
              输出: {tokenUsage.output.toLocaleString()}
            </span>
            <span>
              总计: {tokenUsage.total.toLocaleString()}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
