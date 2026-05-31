# Architecture

## Overview

PI-CY is a desktop AI coding assistant built with Tauri 2, powered by Xiaomi MiMo models via the Pi Agent SDK.

```
┌─────────────────────────────────────────────────────┐
│                 Tauri 2 Desktop App                 │
│  ┌───────────────────────────────────────────────┐  │
│  │          React Frontend (TypeScript)          │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │   Chat   │ │  Editor  │ │  File Tree   │  │  │
│  │  │  Panel   │ │ (Monaco) │ │   + Git      │  │  │
│  │  └────┬─────┘ └────┬─────┘ └──────┬───────┘  │  │
│  │       └─────────────┼──────────────┘          │  │
│  │              WebSocket + REST                 │  │
│  └───────────────────┬───────────────────────────┘  │
│                      │                              │
│  ┌───────────────────┴───────────────────────────┐  │
│  │         Node.js Backend (TypeScript)          │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ RPC Mgr  │ │ WS Mgr  │ │  REST API    │  │  │
│  │  └────┬─────┘ └──────────┘ └──────────────┘  │  │
│  │       │                                       │  │
│  │  ┌────┴───────────────────────────────────┐   │  │
│  │  │        Pi SDK (RPC Mode)               │   │  │
│  │  │  Agent Session │ Tools │ Context       │   │  │
│  │  └────────────────┬──────────────────────┘   │  │
│  └───────────────────┼───────────────────────────┘  │
│                      │                              │
│  ┌───────────────────┴───────────────────────────┐  │
│  │            Tauri Rust Backend                 │  │
│  │  Window Management │ System Integration      │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Xiaomi MiMo API       │
         │  token-plan-cn         │
         │  mimo-v2.5-pro         │
         └────────────────────────┘
```

## Layers

### Frontend (React + TypeScript)

- **Chat Panel**: Message rendering, streaming display, tool call visualization
- **Editor**: Monaco-based code viewer with diff support
- **File Tree**: Git-aware file browser
- **State Management**: Session state, config state, UI state

### Backend (Node.js + TypeScript)

- **RPC Manager**: Spawns and manages Pi agent process via `--mode rpc`
- **WebSocket Manager**: Real-time bidirectional communication with frontend
- **REST API**: File operations, config management, session history

### Tauri (Rust)

- **Window Management**: Native window, system tray, menus
- **System Integration**: File dialogs, notifications, clipboard
- **Security**: IPC command isolation, path sandboxing

### Pi SDK

- **Agent Session**: Conversation management, tool execution
- **Tools**: read, write, edit, bash, grep, find, ls
- **Context Pipeline**: System prompt, compaction, message transformation

## Data Flow

```
User Input → React → WebSocket → Node.js → Pi RPC → MiMo API
                                                ↓
                                    Streaming Response
                                                ↓
              UI Update ← React ← WebSocket ← Node.js ← Pi RPC
```

## Key Design Decisions

1. **Pi SDK as RPC subprocess** — Isolation between UI and agent, crash recovery
2. **WebSocket for streaming** — Real-time token-by-token rendering
3. **Tauri over Electron** — Smaller binary, native performance, Rust security
4. **TypeScript everywhere** — Type safety across frontend and backend
