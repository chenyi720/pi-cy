# PI-CY 增强功能实施计划：MCP、Git 工作树与浅色毛玻璃升级

> 日期：2026-06-02  
> 本计划书概述了 PI-CY 项目三大增强功能的架构、提议修改及实现细节。

---

## 一、 需用户评审的内容

*   **官方 MCP 客户端升级**：从手动解析标准输入输出迁移至官方 `@modelcontextprotocol/sdk` 客户端。这需要重启当前连接的 MCP 子进程，我们将实现支持热重载（Hot-reload）的后台管理机制。
*   **Git 工作树目录规范**：创建 Git Worktree 需要主仓库之外的物理路径。我们默认在主仓库根目录下创建 `.git/worktrees-pi/` 文件夹（需自动添加到 `.gitignore` 中）用于存放临时工作区，以确保主工作区干净。

---

## 二、 开放性问题

1. **默认 MCP 服务器**：是否需要在系统初始化时预置一些常用的公开 MCP 服务器配置（如 `fetch`、`filesystem`、`memory`）到本地 `.mcp.json` 中？
2. **工作树指令执行隔离**：当 Agent 在临时工作树中执行编译或测试时，所有 shell 命令（如 `bash` 工具）是否应自动切换到该 worktree 对应的物理目录执行？

---

## 三、 提议的变更文件与逻辑

### 3.1 模块 1：官方 MCP SDK 适配与设置 UI
使用官方 MCP SDK Stdio 传输协议提升连接稳定性，并为用户提供可视化的服务器配置界面。

*   **[修改] [src/server/mcp/client.ts](file:///c:/Users/admin/Desktop/PI_agent-CY/src/server/mcp/client.ts)**  
    *   引入 `@modelcontextprotocol/sdk/client/index.js` 和 `StdioClientTransport`。
    *   实现 MCP 动态重载接口，避免重启 Node.js 进程。
    *   暴露出 MCP 服务状态查询的 API 端点。
*   **[新建] [src/web/components/McpSettings.tsx](file:///c:/Users/admin/Desktop/PI_agent-CY/src/web/components/McpSettings.tsx)**  
    *   新建设置弹窗/面板，支持用户查看已连接的 MCP 服务状态，动态添加新服务（指定命令、参数、环境变量），并展示每个服务注册的可用工具列表。

---

### 3.2 模块 2：Git Worktree 工作区编排
增加专用 Agent 工具，使 AI 能够安全地在隔离的工作区修改代码和编译。

*   **[新建] [src/server/tools/git-tools.ts](file:///c:/Users/admin/Desktop/PI_agent-CY/src/server/tools/git-tools.ts)**  
    *   注册三个全新的 Agent 工具：
        *   `git_worktree_list`：列出当前所有工作树。
        *   `git_worktree_create`：基于指定分支新建临时工作树。
        *   `git_worktree_remove`：清理并移除指定工作树。
*   **[新建] [src/web/components/GitWorktreePanel.tsx](file:///c:/Users/admin/Desktop/PI_agent-CY/src/web/components/GitWorktreePanel.tsx)**  
    *   在侧边栏新增“工作区”页签，实时渲染当前各工作树的绑定分支、编译状态，并支持用户一键手动切换或清理。

---

### 3.3 模块 3：浅色系毛玻璃视觉升级（Light-mode Glassmorphism）
利用 Tailwind CSS v4 和现代 Web 设计规范，为 PI-CY 带来极具质感的浅色系毛玻璃界面。

*   **[修改] [index.html](file:///c:/Users/admin/Desktop/PI_agent-CY/index.html)**  
    *   载入高质量字体（主文字使用 *Inter* / *Outfit*，代码和终端使用 *JetBrains Mono*）。
*   **[修改] [src/web/App.tsx](file:///c:/Users/admin/Desktop/PI_agent-CY/src/web/App.tsx)**  
    *   重构全局背景：采用柔和的浅色渐变底色，搭配磨砂玻璃层（`bg-white/70 backdrop-blur-md border border-white/40 shadow-xl text-slate-800`）。
    *   重新调配明亮主题下的焦点边框、发光阴影与过渡动画。
*   **[修改] [src/web/components/Sidebar.tsx](file:///c:/Users/admin/Desktop/PI_agent-CY/src/web/components/Sidebar.tsx)**  
    *   升级侧边栏，改为悬浮的浅色半透明卡片 Tab，带上柔和的悬停（Hover）微动画与气泡提示。

---

## 四、 验证计划

### 4.1 自动化测试
*   运行 `npm run typecheck` 检查 TypeScript 编译。
*   运行 `npm run build` 确保前端与后端生产环境包构建无误。

### 4.2 手动验证
*   **MCP 验证**：在设置界面中输入测试 MCP 服务配置，验证其是否能被发现并实时列出工具；指示 Agent 调用此工具并观察执行反馈。
*   **Git Worktree 验证**：指示 Agent 创建 worktree，在其中进行文件改动和构建，确认主工作区未受影响，最终能正常清理。
*   **视觉风格验收**：在各种分辨率下缩放窗口，确保 Monaco 编辑器自适应良好，且毛玻璃滤镜（backdrop-blur）没有带来滚动掉帧。
