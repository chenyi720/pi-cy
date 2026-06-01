# PI-CY × gstack × MiMo-v2.5-pro 融合方案（专业步骤）

> 版本：v3.0
> 
> 日期：2026-06-02
> 
> 状态：待审核
> 
> 前置条件：gstack 已克隆至 `C:\Users\admin\Desktop\gstack克隆`

---

## 一、研究发现

### 1.1 MiMo-v2.5-pro 实际能力（来自 Xiaomi 官方文档）

| 能力 | 详情 | 对 PI-CY 的意义 |
|------|------|----------------|
| **函数调用 (Function Calling)** | 原生支持 OpenAI 兼容格式的 `tools` 参数 | **关键**：可以直接用 MiMo 的原生工具调用，不需要注入 system prompt |
| **联网搜索 (Web Search)** | 原生 `web_search` 工具，支持强制搜索和意图识别 | **关键**：不需要自己实现 web_search 工具，MiMo 内置 |
| **深度思考 (Extended Thinking)** | `thinking: { type: "enabled", budget_tokens: N }` | 可用于复杂推理任务（Plan/Review/Debug） |
| **多模态理解** | mimo-v2.5 支持图片/音频/视频理解 | 识图功能已实现，可扩展到视频 |
| **Anthropic API 兼容** | `https://api.xiaomimimo.com/anthropic/v1/messages` | 可以用 Claude 的 API 格式调用 MiMo |
| **结构化输出** | 支持 JSON Schema 约束输出 | 可用于工具参数解析、Plan 结构化生成 |
| **上下文窗口** | 1M tokens | 足够加载完整代码库 + 技能指令 |
| **最大输出** | 128K tokens | 足够生成完整代码文件 |
| **限流** | 100 RPM / 10M TPM | 足够支撑并行 Agent |

### 1.2 gstack 核心架构（逐行分析）

#### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        gstack v1.55                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  SKILL LAYER (30+ Markdown 技能)                         │    │
│  │  每个技能 = YAML frontmatter + Markdown 指令 + Bash 块   │    │
│  │  office-hours / ship / qa / review / investigate / ...   │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │ reads                               │
│  ┌────────────────────────▼────────────────────────────────┐    │
│  │  TEMPLATE ENGINE (.tmpl → gen-skill-docs.ts → .md)       │    │
│  │  50+ resolver 函数处理 {{PLACEHOLDER}}                    │    │
│  │  关键 resolver: preamble / model-overlay / browse / ...  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  HOST × MODEL 矩阵                                       │    │
│  │  12 个 host (claude/codex/cursor/...)                     │    │
│  │  5 个 model family (claude/gpt/gemini/o-series/mimo)      │    │
│  │  host 控制路径/工具名，model 控制行为补丁                   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  BROWSER DAEMON (Playwright + CDP)                        │    │
│  │  CLI → HTTP → CDP → Chromium                              │    │
│  │  ~100ms/命令，持久化 cookies/tabs                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  PREAMBLE (会话引导)                                      │    │
│  │  每个技能启动时注入 ~100 行 bash 块                        │    │
│  │  设置环境变量、加载上下文、配置行为                         │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

#### gstack 为 Claude 做的专属优化

| 优化点 | gstack 做法 | Claude 特性 | MiMo 对应 |
|--------|------------|------------|----------|
| **工具调用** | `allowed-tools: [Bash, Read, Write, Edit, Glob, Grep]` | Claude 原生 tool_use | MiMo 原生 function calling ✅ |
| **扩展思考** | preamble 中配置 thinking budget | Claude extended thinking | MiMo `thinking: { type: "enabled" }` ✅ |
| **交互确认** | `AskUserQuestion` 工具 | Claude 原生支持 | 需要自定义工具 ⚠️ |
| **技能调用** | `Skill` 工具 | Claude 原生支持 | 需要自定义工具 ⚠️ |
| **子 Agent** | `Agent` 工具 | Claude 原生支持 | 已实现（Phase 5）✅ |
| **联网搜索** | `WebSearch` 工具 | Claude 原生支持 | MiMo 原生 web_search ✅ |
| **浏览器** | `$B <command>` 调用 browse 二进制 | Bash 工具 | 同样方式 ✅ |
| **Plan 模式** | 检测 `CLAUDE_PLAN_FILE` 环境变量 | Claude Code 内置 | 需要自定义检测 ⚠️ |
| **模型补丁** | `model-overlays/claude.md` | Claude 特定行为修正 | 需要 `model-overlays/mimo.md` ⚠️ |

### 1.3 关键发现：gstack 的技能是纯 Markdown

gstack 的技能**不是代码**，而是结构化的 Markdown 指令。AI 读取这些指令后按步骤执行。这意味着：

1. **技能本身是模型无关的** — 任何能读 Markdown + 执行工具的 AI 都能用
2. **优化点在于 preamble 和 model overlay** — 这是针对特定模型的行为调整
3. **browse 二进制是独立的** — 不依赖 Claude，任何 AI 都能通过 Bash 调用

---

## 二、融合方案

### 2.1 总体策略

```
不是"复制 gstack 代码到 PI-CY"
而是"让 PI-CY 的技能系统兼容 gstack 格式，针对 MiMo 优化行为"
```

### 2.2 三层架构

```
Layer 1: 技能兼容层 — 让 PI-CY 能加载和执行 gstack 格式的技能
Layer 2: MiMo 优化层 — 针对 mimo-v2.5-pro 的能力做专属优化
Layer 3: 集成层 — 把技能系统接入 PI-CY 的 AI 对话流程
```

---

## 三、分步实施计划

### Step 1：MiMo 原生函数调用接入（最高优先级）

**目标**：用 MiMo 的原生 function calling 替代当前的 system prompt 注入方案

**依据**：Xiaomi 文档明确支持 `tools` 参数，格式与 OpenAI 兼容

**改动文件**：
- `src/server/rpc.ts` — 启动 pi 时传入工具定义
- `src/server/ws.ts` — 处理 function_call 响应
- `src/server/tools/registry.ts` — 导出工具 schema 为 OpenAI 格式

**具体实现**：

```typescript
// tools schema 转换为 MiMo function calling 格式
function toolsToMimoFormat(): MimoTool[] {
  return getAllTools().map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: tool.parameters,
        required: Object.entries(tool.parameters)
          .filter(([_, def]) => def.required)
          .map(([key]) => key),
      },
    },
  }));
}
```

**验证**：
```bash
# 发送消息让 AI 调用工具
curl -X POST http://localhost:3456/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "读取 package.json 的版本号"}'
# 预期：AI 返回 function_call: { name: "read_file", arguments: { path: "package.json" } }
# PI-CY 拦截并执行，结果回传给 AI
```

### Step 2：MiMo 原生联网搜索接入

**目标**：用 MiMo 的原生 web_search 替代自实现的 web_search 工具

**依据**：Xiaomi 文档支持 `tools: [{ type: "web_search" }]`

**改动文件**：
- `src/server/tools/web-tools.ts` — 移除自实现的 web_search
- `src/server/rpc.ts` — 在 tools 定义中加入 web_search

**具体实现**：
```typescript
// 在 tools 定义中加入 MiMo 原生 web_search
const mimoTools = [
  ...toolsToMimoFormat(),
  {
    type: "web_search",
    max_keyword: 3,
    force_search: false,
  },
];
```

**验证**：
```bash
# 问一个需要联网的问题
curl -X POST http://localhost:3456/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "今天北京天气怎么样？"}'
# 预期：AI 调用 web_search，返回实时天气信息
```

### Step 3：MiMo 深度思考模式接入

**目标**：在 Plan/Review/Debug 等复杂任务中启用 MiMo 的深度思考

**依据**：Xiaomi 文档支持 `thinking: { type: "enabled", budget_tokens: N }`

**改动文件**：
- `src/server/rpc.ts` — 根据任务类型动态切换 thinking 模式
- `src/server/ws.ts` — 处理 thinking_content 输出

**具体实现**：
```typescript
// 根据任务类型选择 thinking 模式
function getThinkingConfig(taskType: string): ThinkingConfig {
  switch (taskType) {
    case "plan":
    case "review":
    case "debug":
      return { type: "enabled", budget_tokens: 10000 };
    default:
      return { type: "disabled" };
  }
}
```

**验证**：
```bash
# 发送需要深度思考的任务
curl -X POST http://localhost:3456/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "分析这个项目的架构，给出改进建议"}'
# 预期：AI 返回 reasoning_content（思考过程）+ 最终回答
```

### Step 4：gstack 技能格式兼容

**目标**：让 PI-CY 的技能加载器能解析 gstack 格式的 SKILL.md

**依据**：gstack 技能使用 YAML frontmatter + Markdown body，PI-CY 已有类似解析

**改动文件**：
- `src/server/skills/loader.ts` — 增强 frontmatter 解析
- `src/server/skills/types.ts` — 扩展字段定义

**需要兼容的 frontmatter 字段**：

```yaml
---
name: qa                          # 技能名
description: Systematically QA test...  # 描述
allowed-tools:                    # 允许的工具
  - Bash
  - Read
  - Write
triggers:                         # 触发词
  - qa test this
  - find bugs
preamble-tier: 4                  # 引导级别 (1-4)
version: 2.0.0                    # 版本
---
```

**验证**：
```bash
# 把 gstack 的一个技能复制到 PI-CY 的 skills/ 目录
cp "C:\Users\admin\Desktop\gstack克隆\qa\SKILL.md" skills/
# 重启 PI-CY，确认技能被加载
curl http://localhost:3456/api/skills
# 预期：返回 qa 技能
```

### Step 5：Preamble 引导系统

**目标**：实现 gstack 的 preamble 机制，每个技能启动时注入引导指令

**依据**：gstack 的 preamble 是 ~100 行 bash 块，设置环境变量、加载上下文

**改动文件**：
- `src/server/skills/executor.ts` — 执行技能前注入 preamble
- `src/server/skills/preamble.ts` — 新建，preamble 生成器

**Preamble 内容**：
```bash
# 会话引导块（每个技能启动时注入）
PI_CY_SESSION_ID=$(uuidgen)
PI_CY_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PI_CY_PROJECT_DIR=$(pwd)
PI_CY_GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
PI_CY_GIT_DIRTY=$(git status --porcelain | wc -l)

# 加载项目上下文
if [ -f "AGENTS.md" ]; then
  echo "=== PROJECT CONTEXT ==="
  cat AGENTS.md
fi

# 加载学习记录
if [ -f ".pi-cy/learnings.jsonl" ]; then
  echo "=== PRIOR LEARNINGS ==="
  tail -20 .pi-cy/learnings.jsonl
fi
```

**验证**：
```bash
# 调用一个技能
curl -X POST http://localhost:3456/api/skills/invoke \
  -H "Content-Type: application/json" \
  -d '{"name": "verify"}'
# 预期：返回的指令中包含 preamble 引导块
```

### Step 6：MiMo Model Overlay

**目标**：创建 MiMo 专属的行为补丁

**依据**：gstack 为每个 model family 创建 overlay，修正特定失败模式

**新建文件**：
- `skills/model-overlays/mimo-v2.5-pro.md`

**内容**：

```markdown
## MiMo-v2.5-pro 行为补丁

### 工具调用纪律
- 批量调用独立工具，串行调用依赖工具
- 不要调用你还没读过输出的工具
- 工具结果用 JSON 格式返回时，解析后再回答用户

### 完成协议
- 每个任务结束时必须报告状态：DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT
- 不要在任务中途停止

### 中英文双语
- 用户用中文提问时，用中文回答
- 技能工作流步骤保持英文（模板系统一致性）
- 代码注释用英文

### 思考透明度
- 使用深度思考时，在执行前用 1-2 句话总结你的方案
- 展示决策，不要展示完整的思考链
```

**验证**：
```bash
# 在系统 prompt 中注入 model overlay
# 对比有/无 overlay 的回答质量
```

### Step 7：核心技能移植（23 个）

**目标**：把 gstack 的核心技能移植到 PI-CY

**依据**：技能是纯 Markdown，只需调整 frontmatter 格式

**移植优先级**：

| 优先级 | 技能 | 功能 | 依赖 |
|--------|------|------|------|
| P0 | `/office-hours` | 产品拷问 | 无 |
| P0 | `/plan-ceo-review` | CEO 级审查 | 无 |
| P0 | `/plan-eng-review` | 架构审查 | 无 |
| P0 | `/review` | 代码审查 | 无 |
| P0 | `/investigate` | 系统化调试 | 无 |
| P1 | `/ship` | 发布工程 | Git |
| P1 | `/qa` | 浏览器 QA | Browse |
| P1 | `/cso` | 安全审计 | 无 |
| P1 | `/spec` | 规格说明 | 无 |
| P1 | `/retro` | 周回顾 | Git |
| P2 | `/design-consultation` | 设计系统 | 无 |
| P2 | `/design-review` | 设计审查 | Browse |
| P2 | `/autoplan` | 自动审查管线 | Plan skills |
| P2 | `/document-release` | 文档更新 | Git |
| P2 | `/canary` | 部署监控 | Browse |
| P3 | 其余 8 个 | 辅助功能 | 各异 |

**移植方法**：
```powershell
# 对每个技能：
# 1. 复制 SKILL.md 到 PI-CY skills/
# 2. 调整 frontmatter 格式
# 3. 替换 Claude 特定工具名为 MiMo 等效名
# 4. 测试执行

$skills = @("office-hours", "plan-ceo-review", "plan-eng-review", "review", "investigate")
foreach ($skill in $skills) {
  Copy-Item "C:\Users\admin\Desktop\gstack克隆\$skill\SKILL.md" "skills\$skill.md"
  # 后续：调整格式
}
```

**验证**：
```bash
# 对每个移植的技能：
# 1. 确认加载成功
curl http://localhost:3456/api/skills | ConvertFrom-Json | Where-Object { $_.name -eq "office-hours" }
# 2. 确认能调用
curl -X POST http://localhost:3456/api/skills/invoke \
  -H "Content-Type: application/json" \
  -d '{"name": "office-hours"}'
```

### Step 8：Browse 浏览器集成

**目标**：集成 gstack 的 browse 二进制，让 PI-CY 具备浏览器能力

**依据**：browse 二进制是独立的，不依赖 Claude，任何 AI 都能通过 Bash 调用

**改动文件**：
- `src/server/tools/bash.ts` — 添加 `$B` 别名
- `scripts/` — 添加 browse 二进制下载/安装脚本

**具体实现**：
```typescript
// 在 bash 工具执行前设置环境变量
const env = {
  ...process.env,
  B: path.join(process.cwd(), "bin", "browse"),
};
```

**验证**：
```bash
# 用 browse 打开一个网页
curl -X POST http://localhost:3456/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"tool":"bash","params":{"command":"$B navigate https://example.com && $B snapshot"}}'
```

### Step 9：Template Engine（模板引擎）

**目标**：实现 gstack 的 `.tmpl` → `.md` 生成管线

**依据**：这是 gstack 的核心，确保 30+ 技能的一致性

**新建文件**：
- `src/server/skills/template-engine.ts` — 模板引擎
- `src/server/skills/resolvers/` — resolver 函数目录

**具体实现**：
```typescript
// 模板引擎核心
function generateSkillMd(template: string, host: string, model: string): string {
  let result = template;
  
  // 替换 {{PLACEHOLDER}}
  result = result.replace(/\{\{PREAMBLE\}\}/g, generatePreamble(host));
  result = result.replace(/\{\{MODEL_OVERLAY\}\}/g, generateModelOverlay(model));
  result = result.replace(/\{\{COMMAND_REFERENCE\}\}/g, generateCommandReference());
  // ... 50+ resolver
  
  return result;
}
```

**验证**：
```bash
# 用模板生成一个技能
curl -X POST http://localhost:3456/api/skills/generate \
  -H "Content-Type: application/json" \
  -d '{"template": "skills/qa/SKILL.md.tmpl", "host": "mimo", "model": "mimo-v2.5-pro"}'
```

### Step 10：前端技能管理 UI

**目标**：在 PI-CY 侧边栏添加技能管理界面

**新建文件**：
- `src/web/components/SkillManager.tsx`

**功能**：
- 技能列表（名称、描述、版本、状态）
- 技能详情（查看完整指令）
- 技能调用（一键执行）
- 技能搜索（按名称/描述过滤）

**验证**：
```bash
# 浏览器中打开 PI-CY
# 点击侧边栏"技能"标签
# 确认显示所有已加载技能
# 点击一个技能，确认显示详情
# 点击"执行"，确认技能被调用
```

---

## 四、验证矩阵

### 4.1 每步验证标准

| Step | 验证命令 | 预期结果 | 自动化 |
|------|---------|---------|--------|
| 1 | AI 调用 read_file | 返回文件内容 | ✅ API 测试 |
| 2 | AI 调用 web_search | 返回实时信息 | ✅ API 测试 |
| 3 | AI 使用深度思考 | 返回 reasoning_content | ✅ API 测试 |
| 4 | 加载 gstack 技能 | 技能列表包含 qa | ✅ API 测试 |
| 5 | 调用技能 | 返回含 preamble 的指令 | ✅ API 测试 |
| 6 | 对比有/无 overlay | 行为差异可见 | ⚠️ 手动 |
| 7 | 移植 23 个技能 | 全部加载成功 | ✅ API 测试 |
| 8 | browse 打开网页 | 返回页面快照 | ✅ API 测试 |
| 9 | 模板生成 | 输出完整 SKILL.md | ✅ 文件检查 |
| 10 | UI 显示技能 | 侧边栏可见 | ✅ 浏览器验证 |

### 4.2 端到端测试场景

| 场景 | 输入 | 预期输出 | 涉及 Step |
|------|------|---------|----------|
| 产品拷问 | "我想做一个日历应用" | AI 执行 /office-hours，提出 6 个逼问 | 7 |
| 代码审查 | "审查 src/server/api/index.ts" | AI 执行 /review，列出问题并修复 | 7 |
| 浏览器 QA | "测试 http://localhost:5173" | AI 执行 /qa，打开浏览器，发现并修复 bug | 7+8 |
| 安全审计 | "检查这个项目的安全性" | AI 执行 /cso，列出 OWASP 问题 | 7 |
| 发布工程 | "准备发布 v0.2.0" | AI 执行 /ship，运行测试，创建 PR | 7 |
| 深度推理 | "分析架构改进方案" | AI 启用 thinking，返回推理过程 | 3 |
| 联网搜索 | "今天有什么科技新闻" | AI 调用 web_search，返回实时新闻 | 2 |

---

## 五、时间线

```
Day 1:     Step 1 (MiMo 函数调用) + Step 2 (联网搜索)
Day 2:     Step 3 (深度思考) + Step 4 (技能格式兼容)
Day 3:     Step 5 (Preamble) + Step 6 (Model Overlay)
Day 4-5:   Step 7 (核心技能移植 P0: 5 个)
Day 6:     Step 7 (核心技能移植 P1: 5 个)
Day 7:     Step 8 (Browse 集成)
Day 8:     Step 7 (核心技能移植 P2: 5 个)
Day 9:     Step 9 (Template Engine)
Day 10:    Step 10 (前端 UI) + 全面测试
```

### 里程碑

| 里程碑 | 天数 | 验证标准 |
|--------|------|---------|
| M1: MiMo 原生工具调用 | Day 1 | AI 能通过 function calling 调用 PI-CY 工具 |
| M2: 技能系统兼容 | Day 3 | 能加载 gstack 格式的 SKILL.md |
| M3: 核心技能可用 | Day 6 | 10 个核心技能全部可调用 |
| M4: 浏览器集成 | Day 7 | /qa 技能能打开浏览器测试 |
| M5: 全部完成 | Day 10 | 23 个技能 + 浏览器 + UI 全部可用 |

---

## 六、风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| pi CLI 不支持传入 tools 定义 | 中 | 高 | 绕过 pi，直接调用 MiMo API |
| MiMo function calling 格式不完全兼容 | 低 | 中 | 适配层转换 |
| gstack 技能中的 bash 块在 Windows 不兼容 | 高 | 中 | 替换为 PowerShell 或 Node.js |
| browse 二进制需要 Bun 运行时 | 中 | 低 | 提供 Node.js 替代方案 |
| 技能移植后 AI 行为与 Claude 不同 | 高 | 中 | Model Overlay 微调 |

---

## 七、附录

### A. 文件变更预估

| Step | 新增文件 | 修改文件 | 预估行数 |
|------|---------|---------|---------|
| 1 | 0 | 3 | +200 |
| 2 | 0 | 1 | +50 |
| 3 | 0 | 2 | +100 |
| 4 | 0 | 2 | +100 |
| 5 | 1 | 1 | +150 |
| 6 | 1 | 0 | +50 |
| 7 | 15 | 0 | +3000 (移植) |
| 8 | 1 | 1 | +200 |
| 9 | 2 | 0 | +400 |
| 10 | 1 | 1 | +300 |
| **总计** | **22** | **12** | **+4550** |

### B. 参考文档

- `C:\Users\admin\Desktop\gstack克隆\` — gstack 源码
- `https://platform.xiaomimimo.com/docs/zh-CN/api/chat/anthropic-api` — MiMo Anthropic API
- `https://platform.xiaomimimo.com/docs/zh-CN/quick-start/model` — MiMo 模型能力
- `https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/tool-calling/web-search` — MiMo 联网搜索
- `plans/ceo-execution-plan.md` — 前期 CEO 级计划
- `plans/surpass-cc-haha-blueprint.md` — 原始蓝图
- `plans/phase5-5-supplement.md` — 补充计划

### C. 变更日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-06-01 | v1.0 | 初始蓝图 |
| 2026-06-02 | v2.0 | CEO 级执行计划 |
| 2026-06-02 | v3.0 | 融合 gstack + MiMo 专属优化方案 |
