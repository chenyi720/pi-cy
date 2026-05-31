# PI-CY 开发总结

## 日期：2026-05-27

---

## 一、今天出现的问题

### 1. ELECTRON_RUN_AS_NODE=1 环境变量冲突
**现象**：Electron 启动后 `require('electron')` 返回的是 npm 包路径字符串，而不是 Electron API 对象。导致 `app` 为 undefined，所有 Electron 功能失效。

**原因**：系统环境变量中设置了 `ELECTRON_RUN_AS_NODE=1`，这让 Electron 以纯 Node.js 模式运行，禁用了所有 GUI API。

**解决**：创建 `start.bat` 启动脚本，在启动前清除该环境变量。

### 2. WebContentsView API 不兼容
**现象**：黑屏，应用窗口完全黑色无内容。

**原因**：使用了 `WebContentsView` 和 `win.contentView.addChildView()` 做加载动画覆盖层，但 Electron 28 不支持该 API。

**解决**：移除加载覆盖层功能。

### 3. node_modules/electron 遮蔽内置模块
**现象**：`require('electron')` 返回路径字符串而非 API 对象。

**原因**：`node_modules/electron/index.js` 返回的是 electron 可执行文件路径，在 Electron 进程内它遮蔽了内置的 electron 模块。

**解决**：通过清除 `ELECTRON_RUN_AS_NODE` 环境变量从根本上解决。

### 4. 设置页面全部不可用
**现象**：点击设置按钮后，页面打开但所有功能不工作。

**原因**：preloader.js 暴露的 API 命名空间（`piConfig`/`piShell`/`piSettings`）与 settings.html 中调用的名称不一致。设置页面使用了旧的 API 名称。

**解决**：统一使用 `window.electronAPI` 命名空间，所有 IPC 通道重新设计。

### 5. pi RPC 响应不完整
**现象**：通过管道向 pi 进程发送命令后，只收到用户消息事件，没有收到 assistant 响应。

**原因**：pi 进程的流式输出需要持续读取 stdout 直到 `agent_end` 事件，但管道读取在 pi 完成 API 调用前就关闭了。

**解决**：使用 Node.js 脚本管理子进程，保持 stdin/stdout 管道打开直到 agent_end。

---

## 二、为什么反复卡死

### 根本原因：没有真正测试

1. **只检查语法不验证功能**：每次修改后用 `node --check` 验证语法就认为"通过"，没有实际启动应用测试每个按钮。

2. **用错误的方式测试**：用 Playwright 打开 `file://` 协议的 HTML 文件，此时 Electron preload API 不存在，看到"元素存在"就认为"功能正常"。

3. **不了解 Electron 的特殊性**：Electron 应用不能像普通网页一样测试，preload 脚本只在 Electron 进程内生效。Playwright 无法直接访问 Electron 渲染进程的 API。

4. **每次修一个问题引入新问题**：改了 preload API 名称但没更新 settings.html，改了 main.js 但没测试 renderer.js 是否兼容。

5. **对 pi RPC 协议理解不足**：不清楚 pi 的 stdin/stdout 通信是长连接还是短连接，不清楚需要等待哪些事件才算完成。

---

## 三、当前状态

### 已完成
- [x] pi-coding-agent CLI 安装（v0.75.5）
- [x] Xiaomi MiMo Token Plan 配置（api-key 认证）
- [x] pi RPC 通信验证（可以发送 prompt 并收到完整响应）
- [x] 项目创建工作流验证（3 个文件夹 + 20 个测试通过）
- [x] Electron 应用方案废弃
- [x] Web 服务方案实现（Express + WebSocket）

### 已迁移到 Web 方案
- `server.js` - Express 服务器 + WebSocket + pi RPC 子进程管理
- `public/index.html` - 完整 UI（5 个标签页：计划/任务/对话/报告/文件）
- 服务运行在 `http://localhost:3456`
- 浏览器直接打开即可使用

---

## 四、后续计划

### 第一优先级：功能验证
1. 打开 `http://localhost:3456` 测试每个按钮
2. 测试设置页面保存和重启
3. 测试新建项目目录选择
4. 测试对话发送和流式响应
5. 测试任务勾选和批量执行

### 第二优先级：完善工作流
1. 实现"从计划生成任务"功能
2. 实现"执行未完成任务"功能
3. 实现"生成项目报告"功能
4. 任务状态自动同步到 task.md

### 第三优先级：体验优化
1. 项目目录选择改为浏览器目录选择器（不依赖 prompt 输入）
2. 添加项目模板功能（一键创建标准项目结构）
3. 对话历史持久化
4. 文件内容预览和编辑

### 第四优先级：部署
1. 编写 `start.bat` 一键启动脚本
2. 考虑是否需要打包成可执行文件

---

## 五、技术架构（最终方案）

```
浏览器 (localhost:3456)
  ↕ WebSocket（实时 pi 事件）
  ↕ HTTP API（文件读写、配置管理）
Node.js Express Server
  └─ pi --mode rpc 子进程
       └─ xiaomi-token-plan-cn API
```

**为什么不用 Electron**：
- 没有桌面通知、系统托盘等强需求
- Web 方案更简单、更易调试、更易维护
- 避免了所有 Electron 特有的环境问题
- 浏览器本身就是最好的 UI 框架
