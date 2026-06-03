<div align="center">

<img src="docs/screenshots/icon.png" alt="PI-CY Logo" width="100" />

# PI-CY

**基于小米 MiMo 的 AI 编程助手**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![Release](https://img.shields.io/github/v/release/chenyi720/pi-cy)](https://github.com/chenyi720/pi-cy/releases)
[![Downloads](https://img.shields.io/github/downloads/chenyi720/pi-cy/total)](https://github.com/chenyi720/pi-cy/releases)
[![Stars](https://img.shields.io/github/stars/chenyi720/pi-cy?style=social)](https://github.com/chenyi720/pi-cy/stargazers)

[English](./README.md) | [中文](./README.zh-CN.md)

</div>

---

## 功能特性

- **AI 对话** — 基于小米 MiMo 模型的自然语言编程辅助
- **代码编辑器** — Monaco 编辑器，支持语法高亮和 Diff 视图
- **文件浏览器** — 树形文件管理，Git 状态感知
- **工具执行** — bash、read、write、edit 工具，带审批流程
- **会话管理** — 多标签会话，历史记录，恢复功能
- **Git 集成** — 分支视图、变更追踪、Worktree 支持
- **快捷键** — 完整的快捷键系统
- **主题切换** — Dark/Light 主题，跟随系统

## 快速开始

### 下载安装

| 平台 | 下载 |
|------|------|
| Windows (.msi) | [最新版本](https://github.com/chenyi720/pi-cy/releases/latest) |
| macOS (.dmg) | [最新版本](https://github.com/chenyi720/pi-cy/releases/latest) |
| Linux (.AppImage) | [最新版本](https://github.com/chenyi720/pi-cy/releases/latest) |

### 从源码构建

```bash
# 前置要求: Node.js >= 22, Rust >= 1.75
git clone https://github.com/chenyi720/pi-cy.git
cd pi-cy
npm install
cargo tauri dev
```

### 配置

设置 MiMo API Key：

```powershell
$env:XIAOMI_TOKEN_PLAN_CN_API_KEY = "你的API密钥"
```

永久设置（Windows）：

```powershell
[System.Environment]::SetEnvironmentVariable("XIAOMI_TOKEN_PLAN_CN_API_KEY", "你的密钥", "User")
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建会话 |
| `Ctrl+B` | 切换侧边栏 |
| `Ctrl+Shift+F` | 切换搜索 |
| `Ctrl+G` | 切换 Git 变更 |
| `Ctrl+Shift+S` | 切换会话历史 |
| `Ctrl+/` | 显示帮助 |

## 技术架构

```
Tauri 2 桌面应用
├── React 前端 (TypeScript + Tailwind CSS)
│   ├── 对话面板 (流式消息)
│   ├── Monaco 编辑器 (代码查看 + Diff)
│   ├── 文件树 (Git 感知)
│   └── 会话管理器
├── Node.js 后端 (TypeScript)
│   ├── Pi SDK RPC 进程
│   ├── WebSocket 服务
│   └── REST API
└── Tauri Rust 后端
    └── 系统集成
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2 (Rust) |
| 前端 | React 19 + TypeScript + Tailwind CSS 4 |
| 编辑器 | Monaco Editor |
| AI 后端 | Pi SDK (RPC 模式) |
| AI 模型 | 小米 MiMo (mimo-v2.5-pro) |
| 构建工具 | Vite 6 |

## 参与贡献

请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 开源协议

基于 [Apache License 2.0](./LICENSE) 开源。
