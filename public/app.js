const $ = id => document.getElementById(id);
let ws, projectDir = '', streaming = false, activeText = null, activeThinking = null, activeFilePath = null;
let logConsoleExpanded = false, unreadLogsCount = 0;

function init() {
  // Load saved theme preference
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    $('theme-icon').textContent = '☀️';
  } else {
    document.body.classList.remove('dark-theme');
    $('theme-icon').textContent = '🌙';
  }

  // Hide sidebar and editor by default (chat-first like Codex)
  document.querySelector('.sidebar').style.display = 'none';
  $('resizer-left').style.display = 'none';
  document.querySelector('.right-pane').style.display = 'none';
  $('resizer-right').style.display = 'none';

  connectWS();
  bindEvents();
  loadSessions();
  loadConfig();
  initLogConsole();
  initWorkspaceResizers();
}

function connectWS() {
  ws = new WebSocket('ws://' + location.host);
  ws.onopen = () => {
    $('dot').classList.add('on');
    $('status-text').textContent = '已连接';
    appendLog('WebSocket 成功连接到 Express 服务器', 'success');
  };
  ws.onclose = () => {
    $('dot').classList.remove('on');
    $('status-text').textContent = '断开';
    appendLog('WebSocket 连接断开，3秒后重试...', 'err');
    setTimeout(connectWS, 3000);
  };
  ws.onmessage = e => {
    try {
      const data = JSON.parse(e.data);
      handlePi(data);
    } catch (err) {}
  };
  ws.onerror = () => {
    appendLog('WebSocket 发生异常', 'err');
  };
}

function bindEvents() {
  // Tabs
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => switchTab(t.dataset.tab));
  
  // Theme toggle
  $('btn-theme').onclick = () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    $('theme-icon').textContent = isDark ? '☀️' : '🌙';
    appendLog(`切换至 ${isDark ? '深色' : '浅色'} 主题`, 'info');
  };

  // New project — open modal instead of prompt()
  $('btn-new').onclick = openProjectModal;
  if ($('btn-init-project')) $('btn-init-project').onclick = openProjectModal;
  if ($('project-path-bubble')) $('project-path-bubble').onclick = openProjectModal;
  $('close-project-modal').onclick = () => $('project-modal').classList.remove('show');
  $('btn-confirm-project').onclick = confirmProjectPath;
  $('project-path-input').addEventListener('keydown', e => { if (e.key === 'Enter') confirmProjectPath(); });
  $('project-modal').addEventListener('click', e => { if (e.target === $('project-modal')) $('project-modal').classList.remove('show'); });
  renderRecentProjects();

  // Settings
  $('btn-settings').onclick = () => { $('settings-modal').classList.add('show'); loadConfig(); };
  $('close-settings').onclick = () => $('settings-modal').classList.remove('show');
  $('save-settings').onclick = saveSettings;
  
  // Sidebar footer controls
  if ($('btn-footer-settings')) $('btn-footer-settings').onclick = () => $('btn-settings').click();
  if ($('btn-footer-skills')) $('btn-footer-skills').onclick = () => {
    alert('当前编程助手已具备以下能力：\n1. 计划管理 (implementation_plan.md)\n2. 任务清单 (task.md)\n3. 项目报告 (walkthrough.md)\n4. 全局搜索\n5. 终端命令环境');
  };

  // Sidebar and editor toggle collapses
  $('btn-toggle-sidebar').onclick = () => {
    const sidebar = document.querySelector('.sidebar');
    const resizerLeft = $('resizer-left');
    if (sidebar.style.display === 'none') {
      sidebar.style.display = 'flex';
      resizerLeft.style.display = 'block';
    } else {
      sidebar.style.display = 'none';
      resizerLeft.style.display = 'none';
    }
  };
  $('btn-toggle-editor').onclick = () => {
    const editor = document.querySelector('.right-pane');
    const resizerRight = $('resizer-right');
    if (editor.style.display === 'none') {
      editor.style.display = 'flex';
      resizerRight.style.display = 'block';
    } else {
      editor.style.display = 'none';
      resizerRight.style.display = 'none';
    }
  };

  // Rules button click
  if ($('btn-sidebar-rules')) $('btn-sidebar-rules').onclick = openOrCreateRulesFile;

  // Chat
  const ci = $('chat-input');
  ci.addEventListener('input', () => { ci.style.height = 'auto'; ci.style.height = Math.min(ci.scrollHeight, 100) + 'px'; });
  ci.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    if (e.key === 'Escape' && streaming) ws.send(JSON.stringify({ type: 'pi', cmd: { type: 'abort' } }));
  });
  $('btn-send').onclick = sendChat;
  
  // Tasks
  $('btn-add-task').onclick = addTask;
  $('btn-execute').onclick = executeTasks;
  $('btn-gen-tasks').onclick = genTasks;
  
  // Files
  $('btn-refresh').onclick = loadFiles;
  $('btn-save-file').onclick = saveActiveFile;

  // File Editor Ctrl+S Bind
  $('file-editor').addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveActiveFile();
    }
  });

  // Terminal actions
  $('btn-terminal-run').onclick = runTerminalCommand;
  $('btn-terminal-kill').onclick = killTerminalCommand;
  $('terminal-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') runTerminalCommand();
  });
}

function initLogConsole() {
  $('log-console').querySelector('.log-console-header').onclick = () => {
    logConsoleExpanded = !logConsoleExpanded;
    $('log-console').style.height = logConsoleExpanded ? '220px' : '36px';
    $('log-toggle-icon').textContent = logConsoleExpanded ? '▼ 收起' : '▲ 展开';
    if (logConsoleExpanded) {
      $('log-badge').style.display = 'none';
      unreadLogsCount = 0;
      $('log-badge').textContent = '0';
    }
  };
}

function appendLog(text, type = 'info') {
  const body = $('log-console-body');
  const d = document.createElement('div');
  d.style.marginBottom = '4px';
  d.style.whiteSpace = 'pre-wrap';
  d.style.wordBreak = 'break-all';
  
  if (type === 'err') d.style.color = 'var(--red)';
  else if (type === 'success') d.style.color = 'var(--green)';
  else if (type === 'cmd') d.style.color = 'var(--cyan)';
  else d.style.color = 'var(--txt-secondary)';
  
  d.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  body.appendChild(d);
  body.scrollTop = body.scrollHeight;
  
  if (!logConsoleExpanded) {
    unreadLogsCount++;
    $('log-badge').style.display = 'inline-block';
    $('log-badge').textContent = unreadLogsCount;
  }
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'p-' + tab));
}

function switchSidebarTab(tab) {
  document.querySelectorAll('.fs-tab').forEach(t => t.classList.toggle('active', t.id === 'fstab-' + tab));
  $('sidebar-files-container').style.display = tab === 'files' ? 'flex' : 'none';
  $('sidebar-search-container').style.display = tab === 'search' ? 'flex' : 'none';
}

async function loadConfig() {
  const r = await fetch('/api/config');
  const cfg = await r.json();
  if (cfg.settings) {
    $('s-provider').value = cfg.settings.defaultProvider || 'xiaomi-token-plan-cn';
    $('s-model').value = cfg.settings.defaultModel || 'mimo-v2.5-pro';
    $('s-think').value = cfg.settings.defaultThinkingLevel || 'medium';
    $('s-sysprompt').value = cfg.settings.customSystemPrompt || '';
    
    // Set badge in chat input hint
    $('chat-model-badge').textContent = cfg.settings.defaultModel || 'mimo-v2.5-pro';
  }
  $('s-dot').className = 'dot ' + (cfg.alive ? 'on' : '');
  $('s-status').textContent = cfg.alive ? 'Pi RPC 进程活跃' : 'Pi RPC 离线';
}

async function saveSettings() {
  const settings = {
    defaultProvider: $('s-provider').value,
    defaultModel: $('s-model').value,
    defaultThinkingLevel: $('s-think').value,
    customSystemPrompt: $('s-sysprompt').value
  };
  await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }) });
  
  const startOpts = {
    provider: settings.defaultProvider,
    model: settings.defaultModel,
    thinking: settings.defaultThinkingLevel,
    systemPrompt: settings.customSystemPrompt
  };
  if (projectDir) startOpts.cwd = projectDir;
  if (activeSessionPath) startOpts.session = activeSessionPath;

  ws.send(JSON.stringify({ type: 'start', opts: startOpts }));
  $('settings-modal').classList.remove('show');
  toast('已保存，Pi 后台进程正在重启...');
  
  // Update UI badge
  $('chat-model-badge').textContent = settings.defaultModel;
}

let activeSessionPath = null;
async function loadSessions() {
  const r = await fetch('/api/sessions');
  const sessions = await r.json();
  const list = $('session-list');
  if (sessions.length === 0) { list.innerHTML = '<div style="color:var(--txt-muted);font-size:11px;padding:8px 12px">暂无历史记录</div>'; return; }
  
  list.innerHTML = sessions.slice(0, 20).map(s => {
    const isActive = s.path === activeSessionPath ? ' active' : '';
    return `
      <div class="sb-item${isActive}" onclick="selectSession('${s.path.replace(/\\/g, '/')}')">
        <span>💬</span>
        <span class="sb-item-name" title="${esc(s.name)}">${esc(s.name)}</span>
        <button class="btn-delete-session" onclick="deleteSession(event, '${s.path.replace(/\\/g, '/')}')" title="删除会话">✕</button>
      </div>
    `;
  }).join('');
}

async function selectSession(path) {
  activeSessionPath = path;
  appendLog(`正在加载历史会话: ${path}`, 'info');
  try {
    const r = await fetch(`/api/session-detail?path=${encodeURIComponent(path)}`);
    if (!r.ok) throw new Error('无法获取会话详情');
    const detail = await r.json();
    
    // Render history in chat window
    $('chat-msgs').innerHTML = '';
    ensureChatActive();
    
    if (detail.messages && detail.messages.length > 0) {
      for (const msg of detail.messages) {
        if (msg.role === 'user') {
          const text = msg.content.map(c => c.type === 'text' ? c.text : '').join('\n');
          appendUser(text);
        } else if (msg.role === 'assistant') {
          appendAi();
          const last = getLastAi();
          const c = last.querySelector('.msg-c');
          
          for (const item of msg.content) {
            if (item.type === 'thinking') {
              const b = document.createElement('div');
              b.className = 'th-block';
              b.innerHTML = '<div class="th-h">💭 思考过程 <span>▶</span></div><div class="th-b"></div>';
              b.querySelector('.th-h').onclick = () => {
                b.classList.toggle('open');
                b.querySelector('.th-h span').textContent = b.classList.contains('open') ? '▼' : '▶';
              };
              b.querySelector('.th-b').textContent = item.thinking;
              c.appendChild(b);
            } else if (item.type === 'text') {
              const span = document.createElement('span');
              span.innerHTML = renderMd(item.text);
              c.appendChild(span);
            } else if (item.type === 'toolCall') {
              const b = document.createElement('div');
              b.className = 'tool-card state-success';
              b.dataset.id = item.id;
              b.innerHTML = `
                <div class="tool-card-header" onclick="this.nextElementSibling.classList.toggle('hide')">
                  <div class="tool-card-title-row">
                    <span class="tool-icon">${getToolIcon(item.name)}</span>
                    <span class="tool-title">${esc(item.name)}</span>
                    <span class="tool-path-cmd">${esc(item.arguments.path || item.arguments.command || '')}</span>
                  </div>
                  <span class="tool-status-badge">完成</span>
                </div>
                <div class="tool-card-details hide">
                  <div class="tool-section args-section">
                    <div class="tool-section-header" onclick="this.nextElementSibling.classList.toggle('hide')">参数</div>
                    <pre class="tool-section-body"><code>${esc(JSON.stringify(item.arguments, null, 2))}</code></pre>
                  </div>
                  <div class="tool-section output-section">
                    <div class="tool-section-header" onclick="this.nextElementSibling.classList.toggle('hide')">输出</div>
                    <pre class="tool-section-body" id="tool-out-${item.id}">加载中...</pre>
                  </div>
                </div>
              `;
              c.appendChild(b);
            }
          }
        } else if (msg.role === 'toolResult') {
          const pre = document.getElementById(`tool-out-${msg.toolCallId}`);
          if (pre) {
            const text = msg.content.map(c => c.type === 'text' ? c.text : '').join('\n');
            pre.textContent = text;
            const card = document.querySelector(`.tool-card[data-id="${msg.toolCallId}"]`);
            if (card) {
              card.className = 'tool-card ' + (msg.isError ? 'state-error' : 'state-success');
              const s = card.querySelector('.tool-status-badge');
              if (s) s.textContent = msg.isError ? '错误' : '完成';
            }
          }
        }
      }
    }
    
    // Trigger a process restart using this session path
    ws.send(JSON.stringify({
      type: 'start',
      opts: {
        provider: $('s-provider').value,
        model: $('s-model').value,
        thinking: $('s-think').value,
        systemPrompt: $('s-sysprompt') ? $('s-sysprompt').value : '',
        cwd: projectDir,
        session: path
      }
    }));
    
    appendLog(`会话历史成功载入并绑定到后台 pi 进程`, 'success');
  } catch (err) {
    appendLog(`载入会话历史失败: ${err.message}`, 'err');
  }
  loadSessions();
}

async function deleteSession(event, path) {
  event.stopPropagation();
  if (!confirm('您确定要删除这个会话历史吗？')) return;
  try {
    const r = await fetch(`/api/session-detail?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
    if (r.ok) {
      toast('会话删除成功！');
      if (activeSessionPath === path) {
        activeSessionPath = null;
        $('chat-msgs').innerHTML = '';
        $('chat-msgs').style.display = 'none';
        $('chat-empty').style.display = 'flex';
      }
      loadSessions();
    }
  } catch (e) {
    alert('删除会话失败: ' + e.message);
  }
}

async function openOrCreateRulesFile() {
  if (!projectDir) { alert('请先选择一个项目'); return; }
  const path = projectDir + '/.roorules';
  appendLog(`正在检查规则文件: ${path}`, 'info');
  try {
    const r = await fetch('/api/file?path=' + encodeURIComponent(path));
    if (r.ok) {
      openFile(path);
    } else {
      if (confirm('当前项目未创建 .roorules 规则文件，是否立即创建？')) {
        const defaultRules = `# Custom rules for this workspace\n# These instructions will be appended to the AI system prompt.\n\n- 总是使用中文进行沟通与输出\n- 保持代码的简洁与高可读性\n`;
        await fetch('/api/file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, content: defaultRules })
        });
        toast('已成功创建 .roorules 规则文件！');
        loadFiles();
        openFile(path);
      }
    }
  } catch (e) {
    alert('操作规则文件失败: ' + e.message);
  }
}

function getToolIcon(name) {
  const icons = {
    read: '📖',
    write: '💾',
    edit: '📝',
    bash: '💻',
    grep: '🔍',
    find: '📂',
    ls: '📁'
  };
  return icons[name] || '🛠️';
}

async function loadProject() {
  if (!projectDir) return;
  
  // Update CWD badge for terminal
  $('terminal-cwd-badge').textContent = `CWD: ${projectDir}`;
  
  // Update path display in sidebar bubble
  if ($('project-name-bubble')) {
    $('project-name-bubble').textContent = '.../' + projectDir.split('/').pop();
  }
  if ($('project-path-bubble')) {
    $('project-path-bubble').title = projectDir;
  }

  // Clear chat panel and show empty logo screen
  $('chat-msgs').innerHTML = '';
  $('chat-msgs').style.display = 'none';
  $('chat-empty').style.display = 'flex';

  // Trigger a pi restart in the new workspace directory
  ws.send(JSON.stringify({
    type: 'start',
    opts: {
      provider: $('s-provider').value,
      model: $('s-model').value,
      thinking: $('s-think').value,
      systemPrompt: $('s-sysprompt') ? $('s-sysprompt').value : '',
      cwd: projectDir
    }
  }));

  // Load plan
  try {
    const r = await fetch('/api/file?path=' + encodeURIComponent(projectDir + '/implementation_plan.md'));
    if (r.ok) {
      const d = await r.json();
      $('plan-empty').style.display = 'none';
      $('plan-view').style.display = 'flex';
      $('plan-body').innerHTML = renderMd(d.content);
      $('plan-title').textContent = extractTitle(d.content);
    } else {
      $('plan-empty').style.display = 'flex';
      $('plan-view').style.display = 'none';
    }
  } catch (e) {
    $('plan-empty').style.display = 'flex';
    $('plan-view').style.display = 'none';
  }
  // Load tasks
  try {
    const r = await fetch('/api/file?path=' + encodeURIComponent(projectDir + '/task.md'));
    if (r.ok) {
      const d = await r.json();
      $('tasks-empty').style.display = 'none';
      $('tasks-view').style.display = 'flex';
      renderTasks(d.content);
    } else {
      $('tasks-empty').style.display = 'flex';
      $('tasks-view').style.display = 'none';
    }
  } catch (e) {
    $('tasks-empty').style.display = 'flex';
    $('tasks-view').style.display = 'none';
  }
  // Load report
  try {
    const r = await fetch('/api/file?path=' + encodeURIComponent(projectDir + '/walkthrough.md'));
    if (r.ok) {
      const d = await r.json();
      $('report-empty').style.display = 'none';
      $('report-view').style.display = 'flex';
      $('report-body').innerHTML = renderMd(d.content);
    } else {
      $('report-empty').style.display = 'flex';
      $('report-view').style.display = 'none';
    }
  } catch (e) {
    $('report-empty').style.display = 'flex';
    $('report-view').style.display = 'none';
  }
  loadFiles();
  renderProjectList();
}

function renderTasks(content) {
  const lines = content.split('\n');
  const list = $('tasks-list'); list.innerHTML = '';
  let total = 0, done = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^- \[([ xX])\] (.+)$/);
    if (!m) continue;
    total++;
    const checked = m[1] !== ' ';
    if (checked) done++;
    const el = document.createElement('div');
    el.className = 'task' + (checked ? ' done' : '');
    el.innerHTML = '<div class="task-cb"></div><div class="task-text">' + esc(m[2]) + '</div>';
    el.onclick = () => toggleTask(i, !checked);
    list.appendChild(el);
  }
  $('progress-fill').style.width = total ? (done / total * 100) + '%' : '0';
  $('progress-text').textContent = done + '/' + total;
}

async function toggleTask(lineNum, checked) {
  const p = projectDir + '/task.md';
  const r = await fetch('/api/file?path=' + encodeURIComponent(p));
  if (!r.ok) return;
  const d = await r.json();
  const lines = d.content.split('\n');
  if (lines[lineNum]) lines[lineNum] = lines[lineNum].replace(/^- \[([ xX])\]/, '- [' + (checked ? 'x' : ' ') + ']');
  await fetch('/api/file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p, content: lines.join('\n') }) });
  renderTasks(lines.join('\n'));
}

async function addTask() {
  const text = prompt('请输入新任务名称:');
  if (!text) return;
  const p = projectDir + '/task.md';
  let content = '';
  try { const r = await fetch('/api/file?path=' + encodeURIComponent(p)); if (r.ok) content = (await r.json()).content; } catch (e) {}
  if (!content) content = '# Tasks\n';
  content += '\n- [ ] ' + text;
  await fetch('/api/file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p, content }) });
  renderTasks(content);
}

async function genTasks() {
  if (!projectDir) { alert('请先创建项目'); return; }
  switchTab('chat');
  piSend({ type: 'prompt', message: 'Read ' + projectDir + '/implementation_plan.md and generate a task.md with checkboxes for each step. Write to ' + projectDir + '/task.md. Just create the file.' });
  appendUser('根据实施计划生成任务清单...');
  streaming = true; updateStream();
}

async function executeTasks() {
  if (!projectDir) { alert('请先创建项目'); return; }
  const r = await fetch('/api/file?path=' + encodeURIComponent(projectDir + '/task.md'));
  if (!r.ok) { alert('没有 task.md'); return; }
  const d = await r.json();
  const pending = d.content.split('\n').filter(l => l.match(/^- \[ \] /));
  if (pending.length === 0) { appendSys('所有任务已完成'); return; }
  switchTab('chat');
  piSend({ type: 'prompt', message: 'Execute pending tasks in ' + projectDir + '/task.md. After each task, update its checkbox to [x].' });
  appendUser('执行 ' + pending.length + ' 个未完成任务...');
  streaming = true; updateStream();
}

async function loadFiles() {
  if (!projectDir) return;
  $('files-empty').style.display = 'none'; $('files-view').style.display = 'flex';
  const r = await fetch('/api/files?path=' + encodeURIComponent(projectDir));
  const items = await r.json();
  const tree = $('files-tree'); tree.innerHTML = '';
  
  activeFilePath = null;
  $('empty-editor').style.display = 'flex';
  $('file-editor').style.display = 'none';
  $('btn-save-file').style.display = 'none';
  $('active-file-title').textContent = '未选择文件';

  items.sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));
  for (const item of items) {
    const el = document.createElement('div');
    el.className = 'file' + (item.isDir ? ' dir' : '');
    el.innerHTML = '<span>' + (item.isDir ? '📁' : '📄') + '</span><span class="fname">' + esc(item.name) + '</span>';
    if (item.isDir) {
      el.onclick = async () => {
        const next = el.nextElementSibling;
        if (next && next.classList.contains('children')) { next.remove(); return; }
        const sr = await fetch('/api/files?path=' + encodeURIComponent(item.path));
        const sub = await sr.json();
        const children = document.createElement('div'); children.className = 'children'; children.style.paddingLeft = '14px';
        sub.sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));
        for (const s of sub) {
          const child = document.createElement('div');
          child.className = 'file' + (s.isDir ? ' dir' : '');
          child.innerHTML = '<span>' + (s.isDir ? '📁' : '📄') + '</span><span class="fname">' + esc(s.name) + '</span>';
          if (!s.isDir) {
            child.onclick = (e) => { e.stopPropagation(); openFile(s.path); };
          }
          children.appendChild(child);
        }
        el.after(children);
      };
    } else {
      el.onclick = () => openFile(item.path);
    }
    tree.appendChild(el);
  }
}

async function openFile(filePath) {
  appendLog(`加载文件: ${filePath}`, 'info');
  const r = await fetch('/api/file?path=' + encodeURIComponent(filePath));
  if (!r.ok) {
    appendLog(`加载文件失败: ${filePath}`, 'err');
    return;
  }
  const d = await r.json();
  $('empty-editor').style.display = 'none';
  $('file-editor').style.display = 'block';
  $('file-editor').value = d.content;
  $('active-file-title').textContent = filePath.split(/[/\\]/).pop();
  $('active-file-title').title = filePath;
  $('btn-save-file').style.display = 'block';
  activeFilePath = filePath;
  
  // Highlight active file in the explorer tree
  document.querySelectorAll('.file').forEach(el => {
    const nameEl = el.querySelector('.fname');
    if (nameEl && nameEl.textContent === filePath.split(/[/\\]/).pop() && !el.classList.contains('dir')) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

async function saveActiveFile() {
  if (!activeFilePath) return;
  const content = $('file-editor').value;
  appendLog(`保存文件: ${activeFilePath}`, 'info');
  const r = await fetch('/api/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: activeFilePath, content })
  });
  if (r.ok) {
    toast('文件保存成功！');
    appendLog(`文件保存成功: ${activeFilePath}`, 'success');
  } else {
    appendLog(`文件保存失败: ${activeFilePath}`, 'err');
    alert('保存失败，请检查文件权限');
  }
}

function renderProjectList() {
  if (!projectDir) { $('project-list').innerHTML = '<span style="color:var(--txt-muted); font-size:11px;">(未指定项目)</span>'; return; }
  $('project-list').innerHTML = '<span style="background:var(--bg-hover); border:1px solid var(--border); border-radius:4px; padding:2px 8px; font-size:11px; color:var(--accent); font-family:monospace; display:inline-block; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="' + esc(projectDir) + '">📂 .../' + esc(projectDir.split('/').pop()) + '</span>';
}

// Chat
function sendChat() {
  const input = $('chat-input');
  const text = input.value.trim();
  if (!text) return;
  if (streaming) {
    piSend({ type: 'steer', message: text });
    appendSys('已发送引导消息');
    appendLog(`发送引导消息: ${text}`, 'cmd');
  } else {
    let msg = text;
    if (projectDir) msg = 'Working in: ' + projectDir + '\n\n' + text;
    piSend({ type: 'prompt', message: msg });
    appendUser(text);
    showThinking();
    streaming = true;
    updateStream();
    appendLog(`发送初始 Prompt: ${text}`, 'cmd');
  }
  input.value = ''; input.style.height = 'auto';
}

function piSend(cmd) { ws.send(JSON.stringify({ type: 'pi', cmd })); }

function ensureChatActive() {
  if ($('chat-empty')) $('chat-empty').style.display = 'none';
  if ($('chat-msgs')) $('chat-msgs').style.display = 'flex';
}

function handlePi(e) {
  if (e.type && e.type !== 'connected') {
    appendLog(JSON.stringify(e));
  }

  switch (e.type) {
    case 'agent_start': streaming = true; updateStream(); break;
    case 'agent_end': streaming = false; hideThinking(); updateStream(); if (projectDir) loadProject(); break;
    case 'message_start':
      hideThinking();
      ensureChatActive();
      if (e.message?.role === 'assistant') { activeText = null; activeThinking = null; appendAi(); }
      break;
    case 'message_update': handleMsgUpdate(e); break;
    case 'message_end': activeText = null; activeThinking = null;
      if (e.message?.usage?.cost?.total) appendSys('当前处理费用: $' + e.message.usage.cost.total.toFixed(4));
      break;
    case 'tool_execution_start': handleToolStart(e); break;
    case 'tool_execution_end': handleToolEnd(e); break;
    case 'stderr': appendLog('[stderr] ' + e.msg, 'err'); break;
    case 'exit': streaming = false; updateStream(); if (e.code !== 0) appendErr('后台 pi 进程退出 (代号: ' + e.code + ')'); break;
    case 'error': appendErr('RPC错误: ' + e.msg); break;
    case 'connected': if (e.alive) { $('dot').classList.add('on'); $('status-text').textContent = '已连接'; } break;
    
    // Command terminal outputs
    case 'cmd_out':
      const scr = $('terminal-screen');
      scr.textContent += e.msg;
      scr.scrollTop = scr.scrollHeight;
      break;
    case 'cmd_exit':
      const scrEnd = $('terminal-screen');
      scrEnd.textContent += `\n[Terminal] 命令已结束，退出码: ${e.code}\n`;
      scrEnd.scrollTop = scrEnd.scrollHeight;
      $('btn-terminal-run').style.display = 'block';
      $('btn-terminal-kill').style.display = 'none';
      break;
  }
  scrollChat();
}

function handleMsgUpdate(e) {
  const d = e.assistantMessageEvent; if (!d) return;
  const last = getLastAi(); if (!last) return;
  const c = last.querySelector('.msg-c'); if (!c) return;
  
  if (d.type === 'text_start') { if (!activeText) { activeText = document.createElement('span'); c.appendChild(activeText); } }
  else if (d.type === 'text_delta') { if (!activeText) { activeText = document.createElement('span'); c.appendChild(activeText); } activeText.classList.add('cursor'); activeText.textContent += d.delta; }
  else if (d.type === 'text_end') { if (activeText) { activeText.classList.remove('cursor'); activeText.innerHTML = renderMd(activeText.textContent); activeText = null; } }
  else if (d.type === 'thinking_start') { if (!activeThinking) { const b = document.createElement('div'); b.className = 'th-block'; b.innerHTML = '<div class="th-h">💭 思考过程 <span>▶</span></div><div class="th-b"></div>'; b.querySelector('.th-h').onclick = () => { b.classList.toggle('open'); b.querySelector('.th-h span').textContent = b.classList.contains('open') ? '▼' : '▶'; }; c.appendChild(b); activeThinking = b.querySelector('.th-b'); } }
  else if (d.type === 'thinking_delta') { if (activeThinking) activeThinking.textContent += d.delta; }
  else if (d.type === 'thinking_end') { activeThinking = null; }
  else if (d.type === 'toolcall_end' && d.toolCall) {
    if (c.querySelector(`.tool-card[data-id="${d.toolCall.id}"]`)) return;
    const b = document.createElement('div');
    b.className = 'tool-card state-success';
    b.dataset.id = d.toolCall.id;
    b.innerHTML = `
      <div class="tool-card-header" onclick="this.nextElementSibling.classList.toggle('hide')">
        <div class="tool-card-title-row">
          <span class="tool-icon">${getToolIcon(d.toolCall.name)}</span>
          <span class="tool-title">${esc(d.toolCall.name)}</span>
          <span class="tool-path-cmd">${esc(d.toolCall.arguments.path || d.toolCall.arguments.command || '')}</span>
        </div>
        <span class="tool-status-badge">完成</span>
      </div>
      <div class="tool-card-details hide">
        <div class="tool-section args-section">
          <div class="tool-section-header" onclick="this.nextElementSibling.classList.toggle('hide')">参数</div>
          <pre class="tool-section-body"><code>${esc(JSON.stringify(d.toolCall.arguments, null, 2))}</code></pre>
        </div>
        <div class="tool-section output-section hide">
          <div class="tool-section-header" onclick="this.nextElementSibling.classList.toggle('hide')">输出</div>
          <pre class="tool-section-body">...</pre>
        </div>
      </div>
    `;
    c.appendChild(b);
  }
  scrollChat();
}

function handleToolStart(e) {
  const last = getLastAi(); if (!last) return;
  const c = last.querySelector('.msg-c'); if (!c) return;
  if (c.querySelector(`.tool-card[data-id="${e.toolCallId}"]`)) return;
  
  const b = document.createElement('div');
  b.className = 'tool-card state-running';
  b.dataset.id = e.toolCallId;
  b.innerHTML = `
    <div class="tool-card-header" onclick="this.nextElementSibling.classList.toggle('hide')">
      <div class="tool-card-title-row">
        <span class="tool-icon">${getToolIcon(e.toolName)}</span>
        <span class="tool-title">${esc(e.toolName)}</span>
        <span class="tool-path-cmd">${esc(e.args.path || e.args.command || '')}</span>
      </div>
      <span class="tool-status-badge">运行中...</span>
    </div>
    <div class="tool-card-details">
      <div class="tool-section args-section">
        <div class="tool-section-header" onclick="this.nextElementSibling.classList.toggle('hide')">参数</div>
        <pre class="tool-section-body"><code>${esc(JSON.stringify(e.args, null, 2))}</code></pre>
      </div>
      <div class="tool-section output-section hide">
        <div class="tool-section-header" onclick="this.nextElementSibling.classList.toggle('hide')">输出</div>
        <pre class="tool-section-body">...</pre>
      </div>
    </div>
  `;
  c.appendChild(b);
  scrollChat();
}

function handleToolEnd(e) {
  const b = document.querySelector(`.tool-card[data-id="${e.toolCallId}"]`); if (!b) return;
  b.className = 'tool-card ' + (e.isError ? 'state-error' : 'state-success');
  const s = b.querySelector('.tool-status-badge');
  if (s) s.textContent = e.isError ? '错误' : '完成';
  
  const outSection = b.querySelector('.output-section');
  if (outSection) {
    outSection.classList.remove('hide');
    const body = outSection.querySelector('.tool-section-body');
    if (body) {
      body.textContent = (e.result?.content?.[0]?.text || '').trim();
    }
  }
}

function appendUser(text) { appendMsg('user', 'U', text); }
function appendAi() { appendMsg('ai', 'PI', ''); }
function appendMsg(role, av, text) {
  ensureChatActive();
  const d = document.createElement('div'); d.className = 'msg ' + role;
  d.innerHTML = '<div class="msg-av">' + av + '</div><div class="msg-body"><div class="msg-c">' + (role === 'user' ? esc(text) : '') + '</div><div class="msg-t">' + timeStr() + '</div></div>';
  $('chat-msgs').appendChild(d); scrollChat();
}
function appendSys(text) { ensureChatActive(); const d = document.createElement('div'); d.className = 'sys'; d.textContent = text; $('chat-msgs').appendChild(d); }
function appendErr(text) { ensureChatActive(); hideThinking(); const d = document.createElement('div'); d.className = 'err'; d.textContent = text; $('chat-msgs').appendChild(d); }
function showThinking() { ensureChatActive(); hideThinking(); const d = document.createElement('div'); d.className = 'thinking'; d.id = 'th-ind'; d.innerHTML = '<span></span><span></span><span></span><span>思考中...</span>'; $('chat-msgs').appendChild(d); scrollChat(); }
function hideThinking() { const el = document.getElementById('th-ind'); if (el) el.remove(); }
function getLastAi() { const m = document.querySelectorAll('.msg.ai'); return m[m.length - 1] || null; }
function scrollChat() { const c = $('chat-msgs'); c.scrollTop = c.scrollHeight; }
function updateStream() { $('stream-st').textContent = streaming ? '● 运行中' : ''; }

function esc(s) { if (!s) return ''; const m = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}; return String(s).replace(/[&<>"']/g, c => m[c]); }
function timeStr() { const d = new Date(); return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0'); }
function extractTitle(md) { const m = md.match(/^#\s+(.+)$/m); return m ? m[1] : '实施计划'; }
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }

// Quick prompt buttons (Codex-style welcome)
function sendQuickPrompt(text) {
  const input = $('chat-input');
  input.value = text;
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  sendChat();
}

function showSidebarAndEditor() {
  document.querySelector('.sidebar').style.display = 'flex';
  $('resizer-left').style.display = 'block';
  document.querySelector('.right-pane').style.display = 'flex';
  $('resizer-right').style.display = 'block';
}

// Global Grep Search
async function performSearch() {
  const query = $('search-input').value.trim();
  if (!query) return;
  if (!projectDir) { alert('请先指定工作目录'); return; }
  const container = $('search-results');
  container.innerHTML = '<div style="color:var(--txt-muted); font-size:11.5px; text-align:center; padding-top:20px;">正在检索中...</div>';
  try {
    const r = await fetch(`/api/search?q=${encodeURIComponent(query)}&path=${encodeURIComponent(projectDir)}`);
    const results = await r.json();
    if (results.length === 0) {
      container.innerHTML = '<div style="color:var(--txt-muted); font-size:11.5px; text-align:center; padding-top:20px;">未找到匹配内容</div>';
      return;
    }
    container.innerHTML = results.map(item => {
      const displayPath = item.path.replace(projectDir + '/', '');
      return `
        <div onclick="openAndFocusFile('${item.path}', ${item.line})" style="padding:8px 10px; background:rgba(0,0,0,0.01); border:1px solid var(--border); border-radius:var(--r); cursor:pointer; font-size:12px; transition:all 0.15s ease;" class="sb-item">
          <div style="font-weight:600; color:var(--cyan); font-family:monospace; margin-bottom:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.path}">${displayPath}:${item.line}</div>
          <div style="font-family:'JetBrains Mono', monospace; font-size:11px; color:var(--txt-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:rgba(0,0,0,0.02); padding:3px 6px; border-radius:4px;">${esc(item.text)}</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<div style="color:var(--red); font-size:11.5px; text-align:center; padding-top:20px;">搜索出错: ${e.message}</div>`;
  }
}

async function openAndFocusFile(filePath, line) {
  await openFile(filePath);
  const textarea = $('file-editor');
  if (textarea && textarea.value) {
    const lines = textarea.value.split('\n');
    let pos = 0;
    for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
      pos += lines[i].length + 1;
    }
    textarea.focus();
    const endPos = pos + (lines[line - 1] ? lines[line - 1].length : 0);
    textarea.setSelectionRange(pos, endPos);
    
    // Smooth scrolling position caret focus inside textbox editor
    const lineHeight = 20.8;
    textarea.scrollTop = Math.max(0, (line - 1) * lineHeight - (textarea.clientHeight / 2));
    appendLog(`已在 ${filePath.split('/').pop()} 中定位到第 ${line} 行`, 'info');
  }
}

// Shell Terminal Command Execution
function runTerminalCommand() {
  const cmdStr = $('terminal-input').value.trim();
  if (!cmdStr) return;
  if (!projectDir) { alert('请先指定工作目录'); return; }
  
  $('terminal-screen').innerHTML = `<div>[Terminal] 正在执行: ${cmdStr}...</div>\n`;
  ws.send(JSON.stringify({
    type: 'run_command',
    cmdStr,
    cwd: projectDir
  }));
  
  $('btn-terminal-run').style.display = 'none';
  $('btn-terminal-kill').style.display = 'block';
}

function killTerminalCommand() {
  ws.send(JSON.stringify({ type: 'kill_command' }));
}

function copyCode(btn) {
  const code = btn.previousElementSibling.innerText;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '已复制!';
    setTimeout(() => btn.textContent = '复制', 2000);
  });
}

function initWorkspaceResizers() {
  const resizerLeft = $('resizer-left');
  const resizerRight = $('resizer-right');
  
  const sidebar = document.querySelector('.sidebar');
  const rightPane = document.querySelector('.right-pane');
  
  let isResizingLeft = false;
  let isResizingRight = false;

  resizerLeft.addEventListener('mousedown', e => {
    isResizingLeft = true;
    resizerLeft.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  resizerRight.addEventListener('mousedown', e => {
    isResizingRight = true;
    resizerRight.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', e => {
    const filesView = $('files-view');
    if (!filesView) return;
    const rect = filesView.getBoundingClientRect();
    
    if (isResizingLeft) {
      let newWidth = e.clientX - rect.left;
      if (newWidth < 180) newWidth = 180;
      if (newWidth > 350) newWidth = 350;
      sidebar.style.width = newWidth + 'px';
    } else if (isResizingRight) {
      let newWidth = rect.right - e.clientX;
      const totalWidth = rect.width;
      if (newWidth < 300) newWidth = 300;
      if (newWidth > totalWidth * 0.65) newWidth = totalWidth * 0.65;
      rightPane.style.width = newWidth + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizingLeft) {
      isResizingLeft = false;
      resizerLeft.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('threeSidebarWidth', sidebar.style.width);
    }
    if (isResizingRight) {
      isResizingRight = false;
      resizerRight.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('threeRightPaneWidth', rightPane.style.width);
    }
  });

  // Load saved positions
  const savedSidebarWidth = localStorage.getItem('threeSidebarWidth');
  if (savedSidebarWidth) sidebar.style.width = savedSidebarWidth;

  const savedRightPaneWidth = localStorage.getItem('threeRightPaneWidth');
  if (savedRightPaneWidth) rightPane.style.width = savedRightPaneWidth;
}

function renderMd(md) {
  if (!md) return '';
  
  // Protect code blocks first
  const codeBlocks = [];
  let h = md.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({ lang, code: esc(code) });
    return id;
  });

  h = esc(h);

  // Restore code blocks with formatting and copy buttons
  for (let i = 0; i < codeBlocks.length; i++) {
    const { lang, code } = codeBlocks[i];
    const isDiff = lang === 'diff' || code.includes('\n+') || code.includes('\n-');
    let formattedCode = code;
    if (isDiff) {
      formattedCode = code.split('\n').map(line => {
        if (line.startsWith('+')) return `<span style="color:var(--green); background:rgba(16, 185, 129, 0.1); display:block; padding-left:4px;">${line}</span>`;
        if (line.startsWith('-')) return `<span style="color:var(--red); background:rgba(239, 68, 68, 0.1); display:block; padding-left:4px;">${line}</span>`;
        return line;
      }).join('\n');
    }
    h = h.replace(`__CODE_BLOCK_${i}__`, 
      `<pre style="position:relative;"><code class="language-${lang}">${formattedCode}</code><button onclick="copyCode(this)" style="position:absolute; right:8px; top:8px; font-size:10px; padding:2px 6px;" class="btn">复制</button></pre>`
    );
  }

  // Parse inline code
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Parse blockquotes and GitHub Alerts
  h = h.replace(/^&gt;\s*\[!(IMPORTANT|NOTE|WARNING|TIP|CAUTION)\]\s*\n([\s\S]*?)(?=\n\n|\n&gt;|\n[^\s&gt;]|$)/gm, (m, type, content) => {
    const colors = {
      IMPORTANT: { border: 'var(--accent)', bg: 'rgba(124, 58, 237, 0.04)', txt: 'var(--accent)' },
      NOTE: { border: 'var(--cyan)', bg: 'rgba(2, 132, 199, 0.04)', txt: 'var(--cyan)' },
      WARNING: { border: 'var(--yellow)', bg: 'rgba(245, 158, 11, 0.04)', txt: 'var(--yellow)' },
      TIP: { border: 'var(--green)', bg: 'rgba(16, 185, 129, 0.04)', txt: 'var(--green)' },
      CAUTION: { border: 'var(--red)', bg: 'rgba(239, 68, 68, 0.04)', txt: 'var(--red)' }
    };
    const c = colors[type] || colors.NOTE;
    const cleanContent = content.replace(/^&gt;\s?/gm, '').trim();
    return `<div style="border-left: 4px solid ${c.border}; background: ${c.bg}; padding: 10px 14px; margin: 12px 0; border-radius: 4px; color: var(--txt-secondary);">
      <strong style="color: ${c.txt}; font-size: 11.5px; text-transform: uppercase; display: block; margin-bottom: 4px;">⚠️ ${type}</strong>
      ${cleanContent}
    </div>`;
  });

  // Normal blockquotes
  h = h.replace(/^&gt;\s*(.+)$/gm, '<blockquote style="border-left: 3px solid var(--border); padding-left: 10px; color: var(--txt-muted); margin: 8px 0;">$1</blockquote>');

  // Parse Headings
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Parse Bold & Italic
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Parse Task lists checkboxes
  h = h.replace(/^- \[x\] (.+)$/gm, '<li style="list-style:none; color:var(--green)">✓ $1</li>');
  h = h.replace(/^- \[ \] (.+)$/gm, '<li style="list-style:none;">☐ $1</li>');
  h = h.replace(/^- (.+)$/gm, '<li>$1</li>');

  // Simple Markdown Tables
  h = h.replace(/^\|(.+)\|$/gm, (match, content) => {
    const cells = content.split('|').map(c => c.trim());
    if (cells.every(c => /^:-*-:|^:-*-|^-*-:|^--*$/.test(c))) return '';
    return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
  });
  h = h.replace(/((?:<tr>.+?<\/tr>)+)/g, '<table style="width:100%; border-collapse:collapse; margin:12px 0;">$1</table>');

  h = h.replace(/^---$/gm, '<hr>');
  h = h.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
  h = h.replace(/\n/g, '<br>');
  return h;
}

// Project Directory Picker Modal
function openProjectModal() {
  $('project-modal').classList.add('show');
  $('project-path-input').value = projectDir || '';
  $('project-path-input').focus();
  renderRecentProjects();
}

function confirmProjectPath() {
  const dir = $('project-path-input').value.trim();
  if (!dir) return;
  projectDir = dir.replace(/\\/g, '/');
  if ($('project-name-bubble')) {
    $('project-name-bubble').textContent = '.../' + projectDir.split('/').pop();
  }
  if ($('project-path-bubble')) {
    $('project-path-bubble').title = projectDir;
  }
  saveRecentProject(projectDir);
  $('project-modal').classList.remove('show');
  showSidebarAndEditor();
  appendLog(`切换项目目录至: ${projectDir}`, 'cmd');
  loadProject();
}

function saveRecentProject(dir) {
  let recent = JSON.parse(localStorage.getItem('recentProjects') || '[]');
  recent = recent.filter(p => p !== dir);
  recent.unshift(dir);
  localStorage.setItem('recentProjects', JSON.stringify(recent.slice(0, 10)));
}

function renderRecentProjects() {
  const container = $('recent-projects');
  if (!container) return;
  const recent = JSON.parse(localStorage.getItem('recentProjects') || '[]');
  if (recent.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = '<div class="slabel" style="margin-bottom: 6px;">最近项目</div>' +
    recent.map(p => `<div class="sb-item" onclick="selectRecentProject('${p.replace(/\\/g, '/')}')" style="font-family:monospace; font-size:11px;" title="${esc(p)}">📂 ${esc(p.split(/[/\\]/).pop())} <span style="color:var(--txt-muted); font-size:10px; margin-left:auto;">${esc(p)}</span></div>`).join('');
}

function selectRecentProject(dir) {
  $('project-path-input').value = dir;
  confirmProjectPath();
}

init();