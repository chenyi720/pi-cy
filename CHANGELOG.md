# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Normalize repository structure: remove tool-generated files from tracking
- Fix all repository URLs from `nicedoc/pi-cy` to `chenyi720/pi-cy`
- Remove broken `$schema` URL from `tauri.conf.json`

## [0.1.0] - 2026-05-31

### Added

#### Core Application

- Tauri 2 desktop app with React 19 + TypeScript + Tailwind CSS 4 frontend
- Node.js backend with WebSocket server and REST API
- Pi SDK integration via RPC mode with Xiaomi MiMo model support
- Smart model routing: `mimo-v2.5-pro` default, `mimo-v2.5` for vision, ComfyUI for image generation

#### Editor & File System

- Monaco Editor with syntax highlighting, diff view, and Ctrl+S save
- File Explorer with tree-based browser and git-aware status
- Automatic `@file` mention content scanning and markdown prompt enrichment
- Recursive workspace files API

#### AI & Chat

- Streaming chat with tool call interception
- Thinking Timeline (collapsible bottom panel)
- Permission dialog connected to WebSocket `permission_request` events
- Dual autocomplete selector popover in chat input

#### Tool Execution

- 10 core tools: bash, read, write, edit, search, and more
- Tool execution framework with approval flow
- EditSuggestion diff preview
- File change tracking

#### MCP & Skills

- MCP client integration with presets
- Skills system with gstack format compatibility (59+ skills auto-loaded)
- Online Skills Editor UI
- Hooks system with API endpoints

#### Agent System

- Plan mode with Visual Plan Orchestrator
- Agent system with Swarm Canvas
- Task system with API endpoints
- Agents Orchestrator with Swarm metrics and Pause/Kill controls

#### ComfyUI Integration

- ComfyUI image generation with HiDream O1 nodes
- Image generation history gallery with metadata sidecars
- ComfyUI Presets management

#### UI & Layout

- Cursor/VS Code-style three-panel IDE layout
- Activity Bar with 9 sidebar tabs
- Welcome Dashboard
- Bottom terminal panel with xterm.js
- Glassmorphic UI with dark/light theme support
- Premium IDE-style frontend design
- Chinese localization for all UI text

#### Desktop Integration

- Tauri system tray integration
- Global shortcut support (Ctrl+Shift+Space)
- Graceful hotkey registration failure handling

#### Git Integration

- Git branch view and change tracking
- Git Worktree tools

#### Infrastructure

- ESLint + Prettier + TypeScript strict mode
- GitHub CI workflow (lint, typecheck, cross-platform build)
- GitHub Release workflow with draft releases
- Community files: LICENSE (Apache 2.0), CONTRIBUTING, CODE_OF_CONDUCT, SECURITY
- Architecture documentation

[Unreleased]: https://github.com/chenyi720/pi-cy/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/chenyi720/pi-cy/releases/tag/v0.1.0
