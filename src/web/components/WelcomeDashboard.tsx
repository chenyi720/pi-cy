interface WelcomeDashboardProps {
  workspacePath: string;
  onTabSelect: (
    tab: "files" | "search" | "git" | "sessions" | "image" | "skills" | "plans",
    subTab?: string
  ) => void;
  onNewSession: () => void;
  toggleHelp: () => void;
  toggleTerminal: () => void;
}

export function WelcomeDashboard({
  workspacePath,
  onTabSelect,
  onNewSession,
  toggleHelp,
  toggleTerminal,
}: WelcomeDashboardProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-50/50 via-blue-50/10 to-indigo-50/10 dark:from-gray-950/50 dark:via-gray-900/10 dark:to-gray-950/10 overflow-y-auto">
      <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
        {/* Header Branding */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white text-3xl shadow-lg shadow-blue-500/20 font-bold border border-blue-400/20">
            PI
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl bg-gradient-to-r from-gray-900 via-gray-800 to-slate-700 dark:from-white dark:via-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
            PI-CY 开发探索空间
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            由小米 MiMo 智能体大模型强力驱动的下一代自主编程与编排环境
          </p>
        </div>

        {/* Current Workspace Path */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/40 dark:bg-gray-800/40 border border-white/40 dark:border-gray-700/30 backdrop-blur-md text-xs font-mono text-gray-600 dark:text-gray-300 shadow-sm max-w-full overflow-hidden">
          <span className="text-blue-500">📁 Workspace:</span>
          <span className="truncate">{workspacePath || "No workspace folder loaded"}</span>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <button
            onClick={() => onTabSelect("files")}
            className="group p-5 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-white/60 dark:border-gray-700/40 hover:border-blue-500/50 dark:hover:border-blue-400/50 backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 text-left cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                📁
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  文件浏览器
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  浏览工作区目录树结构，双击在此处打开或编辑源码文件。
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onTabSelect("plans", "agents")}
            className="group p-5 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-white/60 dark:border-gray-700/40 hover:border-blue-500/50 dark:hover:border-blue-400/50 backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 text-left cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                🤖
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  多智能体 Swarm 画布
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  配置和编排多智能体协同流水线，观察自主规划与代码审查流转。
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onTabSelect("skills", "skills")}
            className="group p-5 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-white/60 dark:border-gray-700/40 hover:border-blue-500/50 dark:hover:border-blue-400/50 backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 text-left cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                ⚡
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  技能沙盒管理器
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  在 Monaco 编辑器中编写 YAML 前置元数据，直接调测运行生成。
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={onNewSession}
            className="group p-5 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-white/60 dark:border-gray-700/40 hover:border-blue-500/50 dark:hover:border-blue-400/50 backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 text-left cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                💬
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  新建 AI 会话
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  开启一个全新的清空历史对话，提供更聚焦的特定任务编码支持。
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Shortcuts Section */}
        <div className="p-5 rounded-2xl bg-white/30 dark:bg-gray-900/30 border border-white/20 dark:border-gray-800/40 backdrop-blur-md text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              常用键盘快捷键
            </span>
            <button
              onClick={toggleHelp}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              显示全部
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            <div className="flex justify-between items-center text-xs py-1">
              <span className="text-gray-600 dark:text-gray-400">新建会话</span>
              <kbd className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-mono scale-90">
                Ctrl + N
              </kbd>
            </div>
            <div className="flex justify-between items-center text-xs py-1">
              <span className="text-gray-600 dark:text-gray-400">折叠/展开侧边栏</span>
              <kbd className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-mono scale-90">
                Ctrl + B
              </kbd>
            </div>
            <button
              onClick={toggleTerminal}
              className="flex justify-between items-center text-xs py-1 hover:bg-gray-200/20 dark:hover:bg-gray-800/20 px-1 rounded -mx-1 text-left cursor-pointer"
            >
              <span className="text-gray-600 dark:text-gray-400">打开/折叠底部终端</span>
              <kbd className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-mono scale-90">
                Ctrl + `
              </kbd>
            </button>
            <div className="flex justify-between items-center text-xs py-1">
              <span className="text-gray-600 dark:text-gray-400">搜索代码文件</span>
              <kbd className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-mono scale-90">
                Ctrl + Shift + F
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
