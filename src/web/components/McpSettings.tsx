import { useState, useEffect } from "react";

interface McpTool {
  name: string;
  server: string;
  description?: string;
}

interface McpStatus {
  initialized: boolean;
  tools: McpTool[];
}

export function McpSettings() {
  const [status, setStatus] = useState<McpStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mcp/status")
      .then((r) => r.json())
      .then((data: McpStatus) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-3 text-xs text-gray-400">加载中...</div>;
  }

  if (!status) {
    return <div className="p-3 text-xs text-gray-400">无法获取 MCP 状态</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          MCP 服务器
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className={`w-2 h-2 rounded-full ${status.initialized ? "bg-green-500" : "bg-gray-400"}`} />
          <span className="text-[10px] text-gray-400">
            {status.initialized ? "已初始化" : "未初始化"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {status.tools.length === 0 ? (
          <div className="p-3 text-xs text-gray-400">
            无 MCP 工具。检查 .mcp.json 配置。
          </div>
        ) : (
          status.tools.map((tool) => (
            <div
              key={`${tool.server}-${tool.name}`}
              className="px-3 py-2 border-b border-gray-100 dark:border-gray-800"
            >
              <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
                {tool.name}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                服务器: {tool.server}
              </div>
              {tool.description && (
                <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                  {tool.description}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
        <div className="text-[10px] text-gray-400">
          配置文件: .mcp.json
        </div>
      </div>
    </div>
  );
}
