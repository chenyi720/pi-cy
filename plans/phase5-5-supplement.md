# PI-CY 超越 cc-haha — 补充计划（诚实评估）

> 日期：2026-06-02
> 基于 Phase 1-5 实际交付后的反思

---

## 一、当前真实状态

### 1.1 已完成的部分（有验证证据）

| 阶段 | 提交 | 后端 API | 前端 UI | 端到端验证 |
|------|------|:--------:|:-------:|:----------:|
| Phase 1: 基础修复 | `7c2bf64` | ✅ | ✅ | ✅ 浏览器验证 |
| Phase 2: 工具系统 | `771e823` | ✅ | ⚠️ | ⚠️ 仅 API 测试 |
| Phase 3: 代码编辑 | `1e6fdf3` | ✅ | ⚠️ | ⚠️ 仅 UI 渲染 |
| Phase 4: MCP/技能/Hook | `5bdf98c` | ✅ | ❌ | ⚠️ 仅 API 测试 |
| Phase 5: Plan/Agent/Task | `a7ca9e6` | ✅ | ❌ | ⚠️ 仅 API 测试 |

### 1.2 后端 API 清单（全部已验证可用）

```
GET  /api/config          ✅ 读取配置
POST /api/config          ✅ 写入配置
GET  /api/files           ✅ 目录列表
GET  /api/file            ✅ 文件内容
GET  /api/search          ✅ 文件搜索 (findstr)
GET  /api/models          ✅ 模型列表 (pi --list-models)
GET  /api/sessions        ✅ 会话列表
GET  /api/session-detail  ✅ 会话详情
DELETE /api/session-detail ✅ 删除会话
GET  /api/git/status      ✅ Git 状态
GET  /api/git/branches    ✅ 分支列表
GET  /api/git/worktrees   ✅ 工作树
POST /api/git/worktree/add ✅ 创建工作树
DELETE /api/git/worktree   ✅ 删除工作树
GET  /api/comfyui/status  ✅ ComfyUI 状态
POST /api/comfyui/generate ✅ 生图
GET  /api/comfyui/image   ✅ 图片服务
GET  /api/tools           ✅ 工具列表 (10个)
POST /api/tools/execute   ✅ 工具执行
GET  /api/mcp/status      ✅ MCP 状态
GET  /api/skills          ✅ 技能列表 (2个)
POST /api/skills/invoke   ✅ 技能调用
GET  /api/hooks           ✅ 钩子列表 (2个)
POST /api/hooks/execute   ✅ 钩子执行
GET  /api/plans           ✅ 计划列表
POST /api/plans           ✅ 创建计划
POST /api/plans/:id/step  ✅ 更新步骤
GET  /api/agents          ✅ Agent 列表
POST /api/agents/spawn    ✅ 生成 Agent
GET  /api/tasks           ✅ 任务列表
POST /api/tasks           ✅ 创建任务
POST /api/tasks/:id/start ✅ 启动任务
POST /api/tasks/:id/cancel ✅ 取消任务
```

### 1.3 前端组件清单

| 组件 | 文件 | 状态 | 说明 |
|------|------|------|------|
| ChatPanel | `ChatPanel.tsx` | ✅ 完整 | 消息渲染、流式更新、思考内容 |
| ChatInput | `ChatInput.tsx` | ✅ 完整 | 文本+图片、粘贴、上传 |
| FileTree | `FileTree.tsx` | ✅ 完整 | 递归展开、变更高亮 |
| FileSearch | `FileSearch.tsx` | ✅ 完整 | 搜索+结果跳转 |
| GitChangesPanel | `GitChangesPanel.tsx` | ✅ 完整 | 分支+文件状态 |
| SessionHistory | `SessionHistory.tsx` | ✅ 完整 | 列表+加载+删除 |
| Editor (Monaco) | `Editor.tsx` | ✅ 完整 | 只读/编辑、Ctrl+S、DiffView |
| StatusBar | `StatusBar.tsx` | ✅ 完整 | 模型+状态+Token |
| ThemeToggle | `ThemeToggle.tsx` | ✅ 完整 | 三态切换 |
| KeyBindings | `KeyBindings.tsx` | ✅ 完整 | 快捷键 |
| ErrorToast | `ErrorToast.tsx` | ✅ 完整 | 错误提示 |
| PermissionDialog | `PermissionDialog.tsx` | ✅ 完整 | 审批弹窗+WS连接 |
| ImageGenerator | `ImageGenerator.tsx` | ✅ 完整 | HiDream O1 参数UI |
| ModelSelector | `ModelSelector.tsx` | ✅ 完整 | 模型下拉切换 |
| TerminalPanel | `TerminalPanel.tsx` | ✅ 完整 | xterm.js 终端 |
| Sidebar | `Sidebar.tsx` | ✅ 完整 | 可调宽度 |
| Markdown | `Markdown.tsx` | ✅ 完整 | marked+highlight.js |
| ToolCallPanel | `ToolCallPanel.tsx` | ✅ 完整 | 工具调用展示 |
| **ToolResultView** | `ToolResultView.tsx` | ⚠️ 已创建未接入 | 工具结果渲染 |
| **EditSuggestion** | `EditSuggestion.tsx` | ⚠️ 已创建未接入 | Diff预览+接受/拒绝 |
| **ChangePanel** | `ChangePanel.tsx` | ⚠️ 已接入Git标签 | 变更文件列表 |
| **MCP 管理 UI** | 不存在 | ❌ | 需要新建 |
| **技能管理 UI** | 不存在 | ❌ | 需要新建 |
| **Plan UI** | 不存在 | ❌ | 需要新建 |
| **Agent UI** | 不存在 | ❌ | 需要新建 |
| **Task UI** | 不存在 | ❌ | 需要新建 |
| **Hook 管理 UI** | 不存在 | ❌ | 需要新建 |

---

## 二、关键缺失（阻塞超越 cc-haha）

### 2.1 最关键：工具未接入 AI 对话

**问题**：10 个工具的 API 存在，但 AI 对话时不会调用它们。当前 AI 只能通过 pi CLI 内置工具工作，PI-CY 自己的工具系统是孤立的。

**影响**：工具执行能力评分从 80 降到 55。

**解决方案**：
1. 把工具 schema 注入 pi 的 system prompt，让 AI 知道有哪些工具可用
2. 或者拦截 pi 的工具调用请求，转发到 PI-CY 的工具引擎
3. 或者独立实现 tool_use 协议，不依赖 pi

**工作量**：2-3 天

### 2.2 次关键：前端管理 UI 缺失

**问题**：Plan、Agent、Task、MCP、Skills、Hooks 都只有后端 API，没有前端界面。

**影响**：用户无法通过 UI 使用这些功能，扩展性评分从 80 降到 70。

**解决方案**：为每个系统创建管理组件，集成到侧边栏。

**工作量**：3-4 天

### 2.3 第三：编辑建议未接入 AI 流程

**问题**：EditSuggestion 组件存在，但 AI 编辑代码时不弹出 Diff 预览。

**影响**：代码编辑体验评分从 80 降到 65。

**解决方案**：拦截 AI 的 write_file/edit_file 调用，改为弹出 EditSuggestion。

**工作量**：1-2 天

---

## 三、修正评分

### 3.1 评分对比

| 维度 | 权重 | cc-haha | Phase 5 声称 | 实际评分 | 差距原因 |
|------|------|---------|-------------|---------|---------|
| AI 对话能力 | 20% | 90 | 85 | **80** | 模型切换已实现，但工具调用未接入 |
| 工具执行能力 | 25% | 95 | 80 | **55** | API 存在但 AI 不调用 |
| 代码编辑体验 | 15% | 85 | 85 | **65** | 组件存在但未集成到 AI 流程 |
| UI/UX 设计 | 15% | 80 | 80 | **72** | 基础 UI 完整，管理 UI 缺失 |
| 扩展性 | 10% | 90 | 85 | **70** | 后端完整，无前端管理 |
| 独特功能 | 15% | 60 | 85 | **80** | ComfyUI 生图、识图、终端 |
| **加权总分** | 100% | **85.3** | **88** | **72.3** | |

### 3.2 超越所需最低分

```
超越 cc-haha 需要总分 > 85.3

当前 72.3 → 需要再提升 13 分

主要提升空间：
- 工具接入 AI：55 → 85 (+30 × 25% = +7.5)
- 编辑集成：65 → 80 (+15 × 15% = +2.25)
- 管理 UI：70 → 85 (+15 × 10% = +1.5)
- UI 完善：72 → 80 (+8 × 15% = +1.2)

总计可提升：+12.45 → 最终 84.75（接近但未超越）

还需要在独特功能上拉开差距：
- 独特功能 80 → 90 (+10 × 15% = +1.5) → 最终 86.25（超越）
```

---

## 四、补充计划（Phase 5.5 + Phase 6）

### Phase 5.5：关键连接（1 周）

**目标**：把已有的后端和前端真正连接起来，评分 72 → 85

#### Step 5.5.1：工具接入 AI 对话（3 天）

| 任务 | 文件 | 验证 |
|------|------|------|
| 工具 schema 注入 system prompt | `src/server/rpc.ts` | AI 知道有哪些工具可用 |
| 拦截 pi 的工具调用，转发到 PI-CY 工具引擎 | `src/server/ws.ts` | AI 调用 bash/read_file 等工具时走 PI-CY 引擎 |
| 工具结果回传给 pi | `src/server/ws.ts` | 工具执行结果正确返回给 AI |
| 权限确认流程 | `src/server/ws.ts` + `PermissionDialog.tsx` | 危险操作弹出确认 |

**验证**：
```
# 在聊天中输入：
"读取 package.json 的内容"
"在 src/ 下搜索包含 TODO 的文件"
"执行 dir 命令"
# 确认 AI 调用了 PI-CY 的工具，结果正确显示
```

#### Step 5.5.2：编辑建议接入（1 天）

| 任务 | 文件 | 验证 |
|------|------|------|
| 拦截 write_file/edit_file 调用 | `src/server/ws.ts` | AI 编辑文件时发送 edit_suggestion 消息 |
| 前端弹出 EditSuggestion | `src/web/App.tsx` | 显示 Diff 预览+接受/拒绝 |
| 接受后执行写入 | `EditSuggestion.tsx` | 点接受后文件更新 |

**验证**：
```
# 在聊天中输入：
"把 package.json 的 version 改为 0.2.0"
# 确认弹出 Diff 预览，点接受后文件更新
```

#### Step 5.5.3：管理 UI（3 天）

| 组件 | 功能 | 验证 |
|------|------|------|
| `PlanView.tsx` | 计划列表+创建+步骤追踪 | UI 能创建/查看/更新计划 |
| `AgentPanel.tsx` | Agent 列表+生成+状态 | UI 能生成 Agent 并查看结果 |
| `TaskPanel.tsx` | 任务列表+创建+启动/取消 | UI 能创建/启动/取消任务 |
| `McpSettings.tsx` | MCP 服务器状态+工具列表 | UI 显示 MCP 状态 |
| `SkillManager.tsx` | 技能列表+调用 | UI 显示/调用技能 |

**验证**：
```
# 侧边栏新增标签：
"计划" → 显示计划列表，能创建新计划
"Agent" → 显示 Agent 定义，能生成 Agent
"任务" → 显示任务列表，能创建/启动任务
```

### Phase 6：独特功能超越（持续）

**目标**：利用 PI-CY 独有优势拉大差距，评分 85 → 92+

#### Step 6.1：ComfyUI 深度集成（2 天）

| 任务 | 验证 |
|------|------|
| 工作流管理 UI | 能导入/编辑/保存 ComfyUI 工作流 |
| img2img 支持 | 能基于现有图片修改 |
| 生成历史 | 查看历史生成的图片 |

#### Step 6.2：小米生态集成（2 天）

| 任务 | 验证 |
|------|------|
| MiMo 模型热切换 | 5 个模型一键切换，无需重启 |
| 模型性能对比 | 同一 prompt 在不同模型下的对比 |

#### Step 6.3：桌面应用完善（3 天）

| 任务 | 验证 |
|------|------|
| Tauri 系统托盘 | 最小化到托盘 |
| 全局快捷键 | Ctrl+Shift+P 唤起 |
| 通知推送 | 任务完成/Agent 完成通知 |
| 文件拖拽 | 拖拽文件到窗口 |

---

## 五、时间线

```
Week 1 (Phase 5.5):
  Day 1-3: 工具接入 AI 对话 ← 最关键
  Day 4:   编辑建议接入
  Day 5-7: 管理 UI (Plan/Agent/Task/MCP/Skills)

Week 2 (Phase 6):
  Day 1-2: ComfyUI 深度集成
  Day 3-4: 小米生态集成
  Day 5-7: 桌面应用完善

Week 3: 收尾 + 全面测试 + 修复
```

### 里程碑

| 里程碑 | 预计时间 | 验证标准 | 评分 |
|--------|---------|---------|------|
| M1: 工具接入 AI | Week 1 Day 3 | AI 能调用 PI-CY 工具 | 72 → 80 |
| M2: 编辑集成 | Week 1 Day 4 | AI 编辑弹出 Diff 预览 | 80 → 82 |
| M3: 管理 UI | Week 1 Day 7 | 所有系统有 UI | 82 → 85 |
| M4: 独特功能 | Week 2 Day 7 | ComfyUI+小米+桌面 | 85 → 90 |
| M5: 全面超越 | Week 3 | 端到端测试通过 | 90 → **92** |

---

## 六、风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| pi CLI 不支持注入自定义工具 | 工具接入方案受阻 | 改用独立 tool_use 协议，不依赖 pi |
| pi 的 RPC 协议文档不足 | 拦截工具调用困难 | 分析 pi stdout 输出格式 |
| Tauri 桌面开发复杂度 | Phase 6 延期 | 优先 Web 版本，桌面渐进增强 |
| ComfyUI API 变更 | 生图功能受影响 | 已有工作流 JSON 备份 |
