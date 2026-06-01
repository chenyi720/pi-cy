# PI-CY 超越 cc-haha 全面蓝图

> 目标：让 PI-CY 在功能完整度、用户体验、AI 能力三个维度全面超越 cc-haha (Claude Code 本地化分支)
> 
> 基准：cc-haha v999.0.0-local (2026-05-31 备份)
> 
> 生成日期：2026-06-01

---

## 一、现状对比总览

### 1.1 能力矩阵

| 维度 | cc-haha | PI-CY 现状 | 差距 | PI-CY 独有优势 |
|------|---------|-----------|------|---------------|
| **AI 模型** | Claude (Anthropic SDK) | MiMo (pi CLI) | 平手 | 本地推理可选 |
| **工具系统** | 59 个工具 | 0 个（依赖 pi 内置） | 🔴 严重 | - |
| **MCP 协议** | 完整客户端+服务端 | 无 | 🔴 严重 | - |
| **技能系统** | 22 内置 + 自定义 | 无 | 🔴 严重 | - |
| **Plan 模式** | 3 工具闭环 | 无 | 🟡 中等 | - |
| **多 Agent** | Team + Sub-agent | 无 | 🟡 中等 | - |
| **会话管理** | 完整（创建/恢复/fork/后台） | 基础（列表/删除） | 🟡 中等 | - |
| **代码编辑** | FileEditTool + DiffView | Monaco 只读展示 | 🟡 中等 | Monaco 集成 |
| **终端执行** | BashTool + PowerShellTool | 后端有，无前端 | 🟡 中等 | - |
| **Web 能力** | Fetch + Search + Browser | 无 | 🟡 中等 | - |
| **图片生成** | 无 | ComfyUI + HiDream O1 | ✅ 超越 | 本地 GPU 生图 |
| **图片识别** | Claude 原生视觉 | mimo-v2.5 多模态 | 平手 | - |
| **IM 适配器** | 4 个（TG/飞书/钉钉/微信） | 无 | 🟡 中等 | - |
| **桌面应用** | Tauri 2 完整集成 | Tauri 2 空壳 | 🟡 中等 | - |
| **UI 汉化** | 英文 | 全中文 | ✅ 超越 | - |
| **模型切换** | 多 Provider | 单 Provider | 🟡 中等 | 小米生态 |
| **定时任务** | Cron 调度 | 无 | 🟡 中等 | - |
| **Hook 系统** | 86 个 Hook | 无 | 🟡 中等 | - |
| **命令系统** | 115+ 命令 | 无 | 🟡 中等 | - |
| **错误恢复** | Doctor 系统 | 基础 ErrorToast | 🟢 轻微 | - |
| **Voice** | 语音输入输出 | 无 | 🟢 轻微 | - |
| **远程访问** | H5 移动端 | 无 | 🟢 轻微 | - |

### 1.2 评分（满分 100）

| 维度 | 权重 | cc-haha | PI-CY 现状 |
|------|------|---------|-----------|
| AI 对话能力 | 25% | 90 | 70 |
| 工具执行能力 | 25% | 95 | 15 |
| 代码编辑体验 | 15% | 85 | 40 |
| UI/UX 设计 | 15% | 80 | 55 |
| 扩展性（MCP/技能/Hook） | 10% | 90 | 5 |
| 独特功能 | 10% | 60 | 75 |
| **加权总分** | 100% | **85.3** | **38.3** |

---

## 二、超越路线图（6 个阶段）

### 阶段概览

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6
基础修复     工具系统     代码编辑     MCP+技能    多Agent     独特功能
(1周)       (2周)       (1周)       (2周)       (2周)       (持续)
  ↓            ↓           ↓           ↓           ↓           ↓
评分: 45     评分: 60     评分: 70     评分: 80     评分: 88     评分: 95+
```

---

## Phase 1：基础修复 + 核心补全（第 1 周）

**目标**：修复所有已知 bug，补齐缺失的基础功能，评分从 38 → 45

### Step 1.1：修复已知 Bug

| 任务 | 文件 | 验证 |
|------|------|------|
| 修复 `/api/search` 端点缺失 | `src/server/api/index.ts` | FileSearch 组件能正常搜索 |
| 修复会话加载不回填聊天记录 | `src/web/App.tsx` | 点击历史会话能恢复对话 |
| 修复 workspace 硬编码路径 | `src/web/App.tsx` | 从配置读取，不在代码里写死 |
| 修复 `start.bat` 引用错误 | `scripts/start.bat` | 双击能启动 |

**验证命令**：
```bash
npm run lint && npx tsc --noEmit
# 手动测试：FileSearch 搜索、点击历史会话、启动脚本
```

### Step 1.2：模型选择 UI

| 任务 | 文件 | 验证 |
|------|------|------|
| 添加模型下拉选择器 | `src/web/components/ModelSelector.tsx` | 能切换 mimo-v2.5-pro / mimo-v2.5 / mimo-v2-flash |
| 状态栏显示当前模型 | `src/web/components/StatusBar.tsx` | 显示完整 provider/model |
| 模型切换发送到后端 | `src/web/api/ws.ts` + `src/server/ws.ts` | 切换后 pi 进程重启用新模型 |

**验证命令**：
```bash
# 切换到 mimo-v2.5 发送消息，确认用的是 mimo-v2.5
# 切换到 mimo-v2-flash 发送消息，确认响应更快
```

### Step 1.3：终端面板

| 任务 | 文件 | 验证 |
|------|------|------|
| 添加 xterm.js 终端组件 | `src/web/components/Terminal.tsx` | 终端能显示 |
| 连接后端 run_command | `src/web/App.tsx` | 能执行命令并看到输出 |
| 添加到侧边栏标签 | `src/web/App.tsx` | 新增"终端"标签 |

**验证命令**：
```bash
npm install xterm @xterm/addon-fit
# 在终端面板输入 dir / ls，确认输出正确
```

### Step 1.4：权限对话框连接

| 任务 | 文件 | 验证 |
|------|------|------|
| pi RPC 工具审批事件解析 | `src/server/rpc.ts` | 捕获 tool_approval 类型消息 |
| 发送到前端 PermissionDialog | `src/server/ws.ts` | WS 发送 permission_request |
| 前端弹出审批对话框 | `src/web/App.tsx` | 用户能点允许/拒绝 |
| 审批结果回传 pi | `src/web/api/ws.ts` | 发送 permission_response |

**验证命令**：
```
# 让 AI 执行一个需要权限的命令（如删除文件）
# 确认弹出审批对话框，点允许后执行成功
```

**Phase 1 里程碑验证**：
```bash
npm run lint && npx tsc --noEmit  # 零错误
# 手动测试清单：
# ✅ FileSearch 能搜索
# ✅ 历史会话能加载
# ✅ 模型能切换
# ✅ 终端能执行命令
# ✅ 权限审批弹窗工作
```

**Phase 1 预期评分**：38 → **45**

---

## Phase 2：工具系统 + 代码执行（第 2-3 周）

**目标**：实现核心工具执行能力，评分从 45 → 60

### Step 2.1：工具执行框架

| 任务 | 文件 | 验证 |
|------|------|------|
| 定义工具接口 (Tool trait) | `src/server/tools/types.ts` | 接口定义清晰 |
| 工具注册表 | `src/server/tools/registry.ts` | 能注册/查找工具 |
| 工具执行引擎 | `src/server/tools/executor.ts` | 能执行工具并返回结果 |
| 安全沙箱 | `src/server/tools/sandbox.ts` | 限制文件访问范围 |

### Step 2.2：核心工具集（10 个）

| # | 工具 | 功能 | 验证 |
|---|------|------|------|
| 1 | **BashTool** | 执行 shell 命令 | `dir` / `ls` 能返回结果 |
| 2 | **PowerShellTool** | 执行 PowerShell | Windows 兼容 |
| 3 | **FileReadTool** | 读取文件内容 | 读取 package.json 正确 |
| 4 | **FileWriteTool** | 写入文件 | 写入后文件存在且内容正确 |
| 5 | **FileEditTool** | 搜索替换编辑 | 编辑后 diff 正确 |
| 6 | **GlobTool** | 文件模式匹配 | `**/*.tsx` 能找到文件 |
| 7 | **GrepTool** | 内容搜索 | 搜索关键词能找到文件 |
| 8 | **LsTool** | 列出目录 | 列出当前目录文件 |
| 9 | **WebFetchTool** | 抓取网页 | 能获取 URL 内容 |
| 10 | **WebSearchTool** | 网络搜索 | 能搜索并返回结果 |

### Step 2.3：工具结果渲染

| 任务 | 文件 | 验证 |
|------|------|------|
| Bash 输出渲染（带语法高亮） | `src/web/components/ToolResultView.tsx` | 命令输出高亮显示 |
| 文件 Diff 渲染 | `src/web/components/DiffView.tsx` | 编辑前后对比 |
| 文件内容渲染 | `src/web/components/FileContentView.tsx` | 读取文件在编辑器展示 |
| 搜索结果渲染 | `src/web/components/SearchResults.tsx` | 搜索结果可点击跳转 |

### Step 2.4：工具权限分级

| 级别 | 工具 | 行为 |
|------|------|------|
| 自动允许 | FileRead, Glob, Grep, Ls | 无需确认 |
| 需要确认 | FileWrite, FileEdit, Bash, PowerShell | 弹出审批 |
| 禁止 | rm -rf /, 格式化等 | 永久拒绝 |

**Phase 2 里程碑验证**：
```bash
# 让 AI 执行以下任务，确认全部成功：
# 1. "读取 package.json 的内容"
# 2. "在 src/ 下搜索所有包含 TODO 的文件"
# 3. "创建一个 hello.txt 文件写入 Hello World"
# 4. "执行 dir 命令列出当前目录"
# 5. "编辑 hello.txt 把 Hello 改为 Hi"
# 6. "删除 hello.txt"（应弹出权限确认）
```

**Phase 2 预期评分**：45 → **60**

---

## Phase 3：代码编辑体验（第 4 周）

**目标**：实现完整的代码编辑闭环，评分从 60 → 70

### Step 3.1：内联代码编辑

| 任务 | 文件 | 验证 |
|------|------|------|
| AI 编辑建议 Diff 预览 | `src/web/components/EditSuggestion.tsx` | 显示 before/after |
| 一键接受/拒绝编辑 | `src/web/components/EditSuggestion.tsx` | 点击按钮生效 |
| 编辑后自动保存 | `src/server/tools/FileEditTool.ts` | 文件自动写入 |

### Step 3.2：Monaco 编辑器增强

| 任务 | 文件 | 验证 |
|------|------|------|
| 编辑器支持直接编辑 | `src/web/components/Editor.tsx` | 能手动编辑文件 |
| 保存快捷键 (Ctrl+S) | `src/web/components/Editor.tsx` | 保存到后端 |
| Diff 编辑器集成 | `src/web/components/Editor.tsx` | 编辑前后对比 |

### Step 3.3：文件变更追踪

| 任务 | 文件 | 验证 |
|------|------|------|
| 追踪 AI 修改的文件列表 | `src/web/stores/chat.ts` | 记录每次编辑 |
| 变更文件高亮 | `src/web/components/FileTree.tsx` | 修改过的文件标红 |
| 一键查看所有变更 | `src/web/components/ChangePanel.tsx` | 汇总显示 |

**Phase 3 里程碑验证**：
```
# 让 AI 编辑一个文件，确认：
# 1. 显示 Diff 预览
# 2. 能接受/拒绝
# 3. 接受后文件自动更新
# 4. FileTree 中修改的文件标红
# 5. Monaco 编辑器能手动编辑并保存
```

**Phase 3 预期评分**：60 → **70**

---

## Phase 4：MCP + 技能系统（第 5-6 周）

**目标**：实现 MCP 协议和技能系统，评分从 70 → 80

### Step 4.1：MCP 客户端

| 任务 | 文件 | 验证 |
|------|------|------|
| MCP SDK 集成 | `src/server/mcp/client.ts` | 能连接 MCP 服务器 |
| MCP 配置管理 | `src/server/mcp/config.ts` | 读取 .mcp.json |
| MCP 工具发现 | `src/server/mcp/discovery.ts` | 发现服务器提供的工具 |
| MCP 工具执行 | `src/server/mcp/executor.ts` | 调用 MCP 工具 |
| MCP 设置页面 | `src/web/components/McpSettings.tsx` | UI 管理 MCP 服务器 |

### Step 4.2：技能系统

| 任务 | 文件 | 验证 |
|------|------|------|
| 技能定义格式 | `src/server/skills/types.ts` | SKILL.md 解析 |
| 技能加载器 | `src/server/skills/loader.ts` | 从目录加载技能 |
| 技能执行器 | `src/server/skills/executor.ts` | 执行技能 |
| 技能管理 UI | `src/web/components/SkillManager.tsx` | 查看/启用/禁用 |
| 内置技能（5 个） | `src/server/skills/bundled/` | verify, debug, simplify, remember, skillify |

### Step 4.3：Hook 系统

| 任务 | 文件 | 验证 |
|------|------|------|
| Hook 定义格式 | `src/server/hooks/types.ts` | YAML/JSON 定义 |
| Hook 注册表 | `src/server/hooks/registry.ts` | 注册/查找 Hook |
| Hook 执行引擎 | `src/server/hooks/executor.ts` | 事件触发执行 |
| 内置 Hook（5 个） | `src/server/hooks/bundled/` | pre-commit, post-edit, on-error, on-start, on-save |

**Phase 4 里程碑验证**：
```
# 1. 连接一个 MCP 服务器（如 filesystem），确认工具可用
# 2. 调用 MCP 工具执行操作
# 3. 加载一个自定义技能并执行
# 4. 配置一个 Hook，编辑文件后自动触发
```

**Phase 4 预期评分**：70 → **80**

---

## Phase 5：多 Agent + Plan 模式（第 7-8 周）

**目标**：实现多 Agent 协作和 Plan 模式，评分从 80 → 88

### Step 5.1：Plan 模式

| 任务 | 文件 | 验证 |
|------|------|------|
| Plan 模式状态管理 | `src/server/plan/types.ts` | 计划状态机 |
| 计划生成 | `src/server/plan/generator.ts` | AI 生成步骤计划 |
| 计划执行追踪 | `src/server/plan/tracker.ts` | 追踪每步完成状态 |
| 计划验证 | `src/server/plan/verifier.ts` | 验证计划完成度 |
| Plan UI | `src/web/components/PlanView.tsx` | 可视化计划步骤 |

### Step 5.2：子 Agent 系统

| 任务 | 文件 | 验证 |
|------|------|------|
| Agent 定义格式 | `src/server/agents/types.ts` | Agent 配置 |
| Agent 生成器 | `src/server/agents/spawner.ts` | 生成子 Agent |
| Agent 通信 | `src/server/agents/messaging.ts` | Agent 间消息 |
| Agent UI | `src/web/components/AgentPanel.tsx` | 管理 Agent |

### Step 5.3：任务系统

| 任务 | 文件 | 验证 |
|------|------|------|
| 后台任务管理 | `src/server/tasks/manager.ts` | 创建/查询/停止任务 |
| 定时任务 (Cron) | `src/server/tasks/cron.ts` | Cron 表达式调度 |
| 任务 UI | `src/web/components/TaskPanel.tsx` | 任务列表/详情 |

**Phase 5 里程碑验证**：
```
# 1. 输入复杂任务，AI 自动进入 Plan 模式生成计划
# 2. 逐步执行计划，UI 显示进度
# 3. 生成子 Agent 并行处理独立任务
# 4. 创建定时任务，到时间自动执行
```

**Phase 5 预期评分**：80 → **88**

---

## Phase 6：独特功能超越（持续迭代）

**目标**：利用 PI-CY 独有优势，评分从 88 → 95+

### Step 6.1：本地 GPU 能力扩展

| 任务 | 验证 |
|------|------|
| ComfyUI 工作流管理 UI | 能导入/编辑/保存工作流 |
| 模型训练 LoRA 微调 | 能上传图片训练 LoRA |
| 图片编辑（img2img） | 能基于现有图片修改 |
| 视频生成（LTX-Video） | 能用 LTX 模型生成短视频 |

### Step 6.2：小米生态集成

| 任务 | 验证 |
|------|------|
| MiMo 模型热切换 | 5 个 MiMo 模型一键切换 |
| 小米设备控制 | 通过 API 控制小米智能家居 |
| MiMo 模型本地推理 | 本地 GPU 运行 MiMo 小模型 |

### Step 6.3：开发者工作流

| 任务 | 验证 |
|------|------|
| Git 可视化（分支图） | 分支/合并/冲突可视化 |
| CI/CD 集成 | GitHub Actions 状态展示 |
| PR 审查 | 在 PI-CY 内审查 PR |
| 代码评审 | AI 自动代码评审 |

### Step 6.4：桌面应用完善

| 任务 | 验证 |
|------|------|
| Tauri 系统托盘 | 最小化到托盘 |
| 全局快捷键 | 随时唤起 PI-CY |
| 通知推送 | 任务完成通知 |
| 文件拖拽 | 拖拽文件到窗口 |

**Phase 6 预期评分**：88 → **95+**

---

## 三、最终评分标准

### 3.1 评分维度与权重

| 维度 | 权重 | 评分标准 |
|------|------|---------|
| **AI 对话能力** | 20% | 模型质量、多模态、上下文管理、流式响应 |
| **工具执行能力** | 25% | 工具数量、执行可靠性、安全沙箱、权限控制 |
| **代码编辑体验** | 15% | 编辑器集成、Diff 预览、变更追踪、保存/撤销 |
| **UI/UX 设计** | 15% | 响应式、主题、国际化、快捷键、无障碍 |
| **扩展性** | 10% | MCP、技能、Hook、插件、自定义命令 |
| **独特功能** | 15% | 本地 GPU、小米生态、生图/识图、独有工具 |

### 3.2 目标评分

| 阶段 | 时间 | AI对话 | 工具执行 | 代码编辑 | UI/UX | 扩展性 | 独特功能 | **总分** |
|------|------|--------|---------|---------|-------|--------|---------|---------|
| 现状 | - | 70 | 15 | 40 | 55 | 5 | 75 | **38.3** |
| Phase 1 | 1周 | 75 | 15 | 40 | 65 | 5 | 75 | **45.0** |
| Phase 2 | 2周 | 78 | 65 | 50 | 65 | 5 | 78 | **60.3** |
| Phase 3 | 1周 | 78 | 70 | 80 | 70 | 5 | 80 | **70.0** |
| Phase 4 | 2周 | 80 | 80 | 80 | 75 | 80 | 82 | **80.3** |
| Phase 5 | 2周 | 85 | 90 | 85 | 80 | 85 | 85 | **87.8** |
| Phase 6 | 持续 | 90 | 92 | 88 | 88 | 88 | 95 | **91.5** |
| **cc-haha** | - | 90 | 95 | 85 | 80 | 90 | 60 | **85.3** |

### 3.3 超越节点

| 节点 | 预计时间 | 超越 cc-haha 的维度 |
|------|---------|-------------------|
| **节点 1** | Phase 2 完成 | 工具执行开始追赶 |
| **节点 2** | Phase 3 完成 | 代码编辑体验超越（Monaco 优势） |
| **节点 3** | Phase 4 完成 | 扩展性持平 |
| **节点 4** | Phase 5 完成 | **总分超越 cc-haha (87.8 > 85.3)** |
| **节点 5** | Phase 6 进行中 | 全面超越，独特功能拉开差距 |

---

## 四、技术架构演进

### 4.1 目标架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PI-CY v2.0 目标架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │
│  │  Desktop App  │   │  Web UI      │   │  CLI (未来)   │            │
│  │  (Tauri 2)    │   │  (React 19)  │   │              │            │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘            │
│         │                  │                  │                     │
│         │    WebSocket     │   pi CLI         │                     │
│         └──────────┬───────┴──────────┬───────┘                     │
│                    │                  │                              │
│  ┌─────────────────▼──────────────────▼───────────────────────────┐ │
│  │                    Node.js Server (port 3456)                   │ │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐            │ │
│  │  │ REST API│ │ WebSocket│ │ 工具引擎 │ │ MCP 客户端│            │ │
│  │  │ 26+端点  │ │ Handler  │ │ 10+工具  │ │ 协议层    │            │ │
│  │  └────┬────┘ └────┬─────┘ └────┬────┘ └────┬─────┘            │ │
│  │       │           │            │            │                   │ │
│  │  ┌────▼───────────▼────────────▼────────────▼───────────────┐  │ │
│  │  │                    Services Layer                         │  │ │
│  │  │  session │ tool │ skill │ hook │ plan │ agent │ task     │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                          │                                          │
│  ┌───────────────────────▼───────────────────────────────────────┐  │
│  │                    AI Provider Layer                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ pi CLI   │ │ MiMo API │ │ ComfyUI  │ │ MCP      │         │  │
│  │  │ (RPC)    │ │ (直连)   │ │ (生图)   │ │ (扩展)   │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 关键技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 工具执行位置 | 服务端 | 安全隔离，复用 pi 进程 |
| MCP 集成方式 | 服务端客户端 | 与 pi CLI 解耦 |
| 技能格式 | Markdown + YAML frontmatter | 兼容 cc-haha 格式 |
| 状态管理 | Zustand (替换 useSyncExternalStore) | DevTools 支持，派生状态 |
| 终端方案 | xterm.js + node-pty | 成熟方案，原生体验 |
| 国际化 | i18next | 支持中英文切换 |

---

## 五、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| pi CLI 不支持自定义工具 | Phase 2 受阻 | 在服务端独立实现工具引擎，不依赖 pi |
| MCP SDK Node.js 兼容性 | Phase 4 受阻 | 使用 @modelcontextprotocol/sdk 官方包 |
| Tauri 2 Rust 开发难度 | Phase 6 受阻 | 优先 Web 版本，桌面功能渐进增强 |
| 性能问题（Monaco + 工具） | 用户体验下降 | 代码分割，懒加载，虚拟滚动 |
| 小米 API 变更 | 对话功能受影响 | 多 Provider 支持作为备选 |

---

## 六、依赖清单

### 需要新增的 npm 依赖

| 包名 | 用途 | 阶段 |
|------|------|------|
| `@modelcontextprotocol/sdk` | MCP 协议 | Phase 4 |
| `xterm` + `@xterm/addon-fit` | 终端面板 | Phase 1 |
| `node-pty` | 终端后端 | Phase 1 |
| `zustand` | 状态管理 | Phase 2 |
| `i18next` + `react-i18next` | 国际化 | Phase 3 |
| `lucide-react` | 图标库 | Phase 2 |
| `diff` | 文本 Diff | Phase 3 |
| `node-cron` | 定时任务 | Phase 5 |

---

## 七、执行顺序总结

```
Week 1:  [Phase 1] 基础修复 → 模型选择 → 终端面板 → 权限对话框
Week 2:  [Phase 2] 工具框架 → 5个核心工具(Bash/Read/Write/Glob/Grep)
Week 3:  [Phase 2] 剩余5个工具 → 工具结果渲染 → 权限分级
Week 4:  [Phase 3] 内联编辑 → Monaco增强 → 变更追踪
Week 5:  [Phase 4] MCP客户端 → MCP设置UI
Week 6:  [Phase 4] 技能系统 → Hook系统
Week 7:  [Phase 5] Plan模式 → 计划UI
Week 8:  [Phase 5] 子Agent → 任务系统 → 定时任务
Week 9+: [Phase 6] 本地GPU扩展 → 小米生态 → 桌面完善
```

**关键里程碑**：
- **Week 3 结束**：PI-CY 评分 60，工具能力基本可用
- **Week 6 结束**：PI-CY 评分 80，扩展性持平 cc-haha
- **Week 8 结束**：PI-CY 评分 88，**总分超越 cc-haha**
- **Week 9+**：PI-CY 评分 95+，全面超越并建立独特优势
