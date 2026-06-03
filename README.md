<div align="center">

<img src="docs/screenshots/icon.png" alt="PI-CY Logo" width="100" />

# PI-CY

**AI Coding Assistant powered by Xiaomi MiMo**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![Release](https://img.shields.io/github/v/release/chenyi720/pi-cy)](https://github.com/chenyi720/pi-cy/releases)
[![Downloads](https://img.shields.io/github/downloads/chenyi720/pi-cy/total)](https://github.com/chenyi720/pi-cy/releases)
[![Stars](https://img.shields.io/github/stars/chenyi720/pi-cy?style=social)](https://github.com/chenyi720/pi-cy/stargazers)

[English](./README.md) | [中文](./README.zh-CN.md)

</div>

---

## Features

- **AI Chat** — Natural language coding assistance via Xiaomi MiMo models
- **Code Editor** — Monaco-based editor with syntax highlighting and diff view
- **File Explorer** — Tree-based file browser with git-aware status
- **Tool Execution** — bash, read, write, edit tools with approval flow
- **Session Management** — Multi-tab sessions with history and restore
- **Git Integration** — Branch view, change tracking, worktree support
- **Keyboard Shortcuts** — Full shortcut system for power users
- **Dark/Light Theme** — System-aware theme switching

## Quick Start

### Download

| Platform | Download |
|----------|----------|
| Windows (.msi) | [Latest Release](https://github.com/chenyi720/pi-cy/releases/latest) |
| macOS (.dmg) | [Latest Release](https://github.com/chenyi720/pi-cy/releases/latest) |
| Linux (.AppImage) | [Latest Release](https://github.com/chenyi720/pi-cy/releases/latest) |

### Build from Source

```bash
# Prerequisites: Node.js >= 22, Rust >= 1.75
git clone https://github.com/chenyi720/pi-cy.git
cd pi-cy
npm install
cargo tauri dev
```

### Configuration

Set your MiMo API key:

```powershell
$env:XIAOMI_TOKEN_PLAN_CN_API_KEY = "your-api-key-here"
```

Or permanently (Windows):

```powershell
[System.Environment]::SetEnvironmentVariable("XIAOMI_TOKEN_PLAN_CN_API_KEY", "your-key", "User")
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New session |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Shift+F` | Toggle search |
| `Ctrl+G` | Toggle git changes |
| `Ctrl+Shift+S` | Toggle session history |
| `Ctrl+/` | Show help |

## Architecture

```
Tauri 2 Desktop App
├── React Frontend (TypeScript + Tailwind CSS)
│   ├── Chat Panel (streaming messages)
│   ├── Monaco Editor (code view + diff)
│   ├── File Tree (git-aware)
│   └── Session Manager
├── Node.js Backend (TypeScript)
│   ├── Pi SDK RPC Process
│   ├── WebSocket Server
│   └── REST API
└── Tauri Rust Backend
    └── System Integration
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript + Tailwind CSS 4 |
| Editor | Monaco Editor |
| AI Backend | Pi SDK (RPC mode) |
| AI Model | Xiaomi MiMo (mimo-v2.5-pro) |
| Build | Vite 6 |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Licensed under [Apache License 2.0](./LICENSE).
