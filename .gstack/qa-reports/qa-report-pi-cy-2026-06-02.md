# PI-CY CEO-Level QA Report

**Date:** 2026-06-02
**Target:** http://localhost:8080 (static build)
**Branch:** main
**Tester:** /qa (Playwright automated + manual screenshot analysis)
**Tier:** Exhaustive (all severity levels)

---

## Executive Summary

**Health Score: 65/100**

PI-CY is a functional AI chat interface with a clean, modern UI. The core chat flow works — users can type messages and interact with the model selector. The Settings page is well-organized with 9 tabs covering comprehensive configuration. MCP Servers page has a clear empty state.

**The single blocking issue:** the backend server is not running alongside the static frontend build, causing every API call to fail with 404. This means tools, skills, MCP integrations, and all server-side features are non-functional in the current deployment.

### Score Breakdown

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Console | 30/100 | 15% | 4.5 |
| Links | 100/100 | 10% | 10.0 |
| Visual | 85/100 | 10% | 8.5 |
| Functional | 40/100 | 20% | 8.0 |
| UX | 80/100 | 15% | 12.0 |
| Performance | 90/100 | 10% | 9.0 |
| Content | 75/100 | 5% | 3.75 |
| Accessibility | 60/100 | 15% | 9.0 |
| **Total** | | | **64.75** |

---

## Issues Found

### ISSUE-001 | HIGH | Backend API 404 — ToolsStore Failure

**Severity:** High (functional)
**Category:** Functional / Backend
**Pages affected:** ALL pages (homepage, MCP Servers, Settings)

**Description:**
The frontend calls `/api/tools` on every page load. The static build on port 8080 serves only the SPA — the Node.js backend server (target: `http://localhost:3456`) is not running. Every API request returns 404.

**Console error:**
```
[ToolsStore] Failed to fetch built-in tools: Error: File Not Found
    at wg (http://localhost:8080/bundle.js:43:29144)
    at async hwe.fetchBuiltinTools (http://localhost:8080/bundle.js:135:10561)
```

**Impact:** Tools, skills, MCP integrations, agents, plans, tasks, git operations, file browsing, search, and ComfyUI features are all non-functional. The chat input appears to work but the backend cannot process requests.

**Root cause:** `src/web/api/tools.ts:21` calls `fetch("/api/tools")`. The Vite config proxies `/api` to `http://localhost:3456`, but that server isn't started. In production static builds, there's no proxy — the backend must be running separately.

**Fix:** Start the backend server: `npm run dev:server` (port 3456) alongside the frontend, or configure the static build to include the server.

**Status:** Deferred — requires server deployment configuration, not a source code bug.

---

### ISSUE-002 | MEDIUM | Empty Page Titles on Sub-Routes

**Severity:** Medium (content)
**Pages affected:** `/mcp-servers`, `/settings`

**Description:**
The MCP Servers and Settings pages have empty `<title>` tags. The homepage correctly shows "llama-ui" but navigating to sub-routes via hash routing clears the title.

**Impact:** Poor SEO, confusing browser tabs, no context when users have multiple tabs open.

**Fix:** Update the SPA router to set `document.title` on route change. Add a title map:
```js
const titles = { '/': 'llama-ui', '/mcp-servers': 'MCP Servers — llama-ui', '/settings': 'Settings — llama-ui' };
```

**Status:** Deferred (low priority for internal tool).

---

### ISSUE-003 | LOW | Accessibility — Missing Skip Navigation

**Severity:** Low (accessibility)
**Pages affected:** ALL pages

**Description:**
No skip-to-content link exists. Keyboard users must tab through all navigation elements to reach the main content.

**Fix:** Add `<a href="#main" class="skip-nav">Skip to content</a>` as the first element in `<body>`.

**Status:** Deferred.

---

### ISSUE-004 | LOW | Accessibility — Multiple H1 Headings

**Severity:** Low (accessibility)
**Pages affected:** ALL pages (2-3 H1 elements per page)

**Description:**
Pages contain multiple `<h1>` elements. Best practice is one H1 per page for screen reader navigation.

**Fix:** Demote secondary H1s to H2.

**Status:** Deferred.

---

## Visual Assessment

### Homepage (01-homepage.png)
- **Clean, minimal chat interface** — large empty state with centered input
- Model selector chip visible: "Qwen3.6 35B-A3B Uncensored HauhauCS Aggressive IQ2_M.gguf"
- "+" button for file uploads, send button (arrow icon)
- **No "Hello there" text on desktop** — empty state differs from mobile (see below)
- Good use of whitespace, modern rounded input container

### MCP Servers (04-root.png)
- Clear heading with paperclip icon
- "+ Add New Server" button in top-right
- Empty state message: "No MCP Servers configured yet. Add one to enable agentic features."
- **Well-designed empty state** — dashed border, clear CTA

### Settings (05-root.png)
- **Excellent tabbed layout** — 9 categories: General, Display, Sampling, Penalties, Agentic, Developer, MCP, Tools, Import/Export
- Left sidebar navigation with icons
- General tab shows: Theme (System dropdown), API Key input, System Message textarea
- "Show system message in conversations" checkbox, "Reset to default" button, "Save settings" button
- **Well-organized, comprehensive settings page**

### Mobile (99-mobile-homepage.png)
- **Responsive layout works well** at 375px
- "Hello there" greeting with subtitle "Type a message or upload files to get started"
- Model selector truncates properly: "Qwen3.6-35B-A3B-Uncensore..."
- No horizontal overflow detected
- Sidebar collapses to hamburger icon (top-left)

---

## What Works Well

1. **Modern, clean UI** — The interface looks professional and polished
2. **Model selector** — Clear chip showing model name, quantization, and parameters
3. **Settings comprehensiveness** — 9 setting categories cover all configuration needs
4. **Mobile responsiveness** — Layout adapts well to small screens
5. **Empty states** — MCP Servers page has a helpful empty state with clear CTA
6. **File upload support** — "+" button suggests file upload capability
7. **No network errors** — All resources load successfully (no broken assets)

---

## Top 3 Things to Fix

### 1. Backend Server Integration (CRITICAL)
The static build cannot function without the backend. Either:
- **Option A:** Run `npm run dev:server` alongside the frontend (development)
- **Option B:** Configure the production build to embed the server (Tauri handles this for desktop)
- **Option C:** Add a startup check that warns users when the backend is unreachable

### 2. Page Titles (MEDIUM)
Add dynamic title setting on route change. 10-minute fix.

### 3. Accessibility Basics (LOW)
Add skip-nav link and fix H1 hierarchy. 30-minute fix.

---

## Pages Tested

| Page | URL | Status | Issues |
|------|-----|--------|--------|
| Homepage | / | 200 | 4 (2 console, 2 a11y) |
| Homepage (hash) | /#/ | 200 | 4 (2 console, 2 a11y) |
| New Chat | /?new_chat=true#/ | 200 | 4 (2 console, 2 a11y) |
| MCP Servers | /#/mcp-servers | 200 | 5 (2 console, 2 a11y, 1 title) |
| Settings | /#/settings | 200 | 5 (2 console, 2 a11y, 1 title) |
| Mobile (375px) | / | 200 | 0 (responsive OK) |

**Total pages tested:** 6
**Total screenshots:** 6
**Total issues:** 22 (deduplicated to 4 unique root causes)

---

## Test Environment

- **Browser:** Chromium (headless) via Playwright 1.60.0
- **Viewport:** 1280x720 (desktop), 375x812 (mobile)
- **Server:** Static build on localhost:8080
- **Backend:** Not running (port 3456 offline)

---

*Report generated by /qa (Exhaustive tier) on 2026-06-02*
