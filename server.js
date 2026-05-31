const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

let piProc = null;
let rpcBuf = '';
let clients = new Set();
let activeCmdProc = null;
let currentProjectDir = '';

const ALLOWED_ROOTS = [
  path.resolve(__dirname, 'public'),
  path.join(os.homedir(), '.pi'),
];

function isPathAllowed(targetPath) {
  const resolved = path.resolve(targetPath).toLowerCase();
  const sep = path.sep;
  return ALLOWED_ROOTS.some(root => resolved.startsWith(root.toLowerCase() + sep) || resolved === root.toLowerCase())
    || (currentProjectDir && (resolved.startsWith(currentProjectDir.toLowerCase() + sep) || resolved === currentProjectDir.toLowerCase()));
}

function safePath(userPath) {
  if (!userPath) return null;
  const resolved = path.resolve(userPath);
  if (!isPathAllowed(resolved)) return null;
  return resolved;
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of clients) { try { ws.send(data); } catch (e) {} }
}

function startPi(opts = {}) {
  if (piProc) killPi();
  const args = ['--mode', 'rpc'];
  if (opts.provider) args.push('--provider', opts.provider);
  if (opts.model) args.push('--model', opts.model);
  if (opts.thinking && opts.thinking !== 'off') args.push('--thinking', opts.thinking);
  if (opts.session) args.push('--session', opts.session);
  if (opts.systemPrompt && opts.systemPrompt.trim()) args.push('--system-prompt', opts.systemPrompt.trim());
  
  const targetCwd = opts.cwd || process.cwd();
  currentProjectDir = path.resolve(targetCwd);

  // Custom rules support: check for .roorules or .pi-rules in workspace CWD
  try {
    const rulesPath1 = path.join(targetCwd, '.roorules');
    const rulesPath2 = path.join(targetCwd, '.pi-rules');
    let rulesContent = '';
    if (fs.existsSync(rulesPath1)) {
      rulesContent = fs.readFileSync(rulesPath1, 'utf-8');
    } else if (fs.existsSync(rulesPath2)) {
      rulesContent = fs.readFileSync(rulesPath2, 'utf-8');
    }
    if (rulesContent.trim()) {
      console.log(`Appending system prompt rules from workspace. Length: ${rulesContent.trim().length}`);
      args.push('--append-system-prompt', rulesContent.trim());
    }
  } catch (err) {
    console.error(`Error reading custom rules: ${err.message}`);
  }

  console.log(`Spawning pi process in cwd: ${targetCwd} with args: ${args.join(' ')}`);
  piProc = spawn('pi', args, { stdio: ['pipe', 'pipe', 'pipe'], shell: true, cwd: targetCwd });
  rpcBuf = '';
  piProc.stdout.on('data', chunk => {
    rpcBuf += chunk.toString();
    const lines = rpcBuf.split('\n'); rpcBuf = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim(); if (!t) continue;
      try { broadcast(JSON.parse(t)); } catch (e) { console.error('Failed to parse pi stdout line:', t.slice(0, 200)); }
    }
  });
  piProc.stderr.on('data', chunk => {
    const msg = chunk.toString().trim();
    console.error(`pi stderr: ${msg}`);
    broadcast({ type: 'stderr', msg });
  });
  piProc.on('exit', code => {
    console.log(`pi exited with code: ${code}`);
    piProc = null;
    broadcast({ type: 'exit', code });
  });
  piProc.on('error', err => {
    console.error(`pi spawn error: ${err.message}`);
    piProc = null;
    broadcast({ type: 'error', msg: err.message });
  });
}

function piSend(cmd) {
  if (!piProc || !piProc.stdin.writable) return false;
  try { piProc.stdin.write(JSON.stringify(cmd) + '\n'); return true; } catch (e) { return false; }
}

function killPi() { if (piProc) { try { piProc.kill(); } catch (e) {} piProc = null; } }

// WebSocket
wss.on('connection', ws => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'connected', alive: !!piProc }));
  ws.on('close', () => clients.delete(ws));
  ws.on('message', data => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'pi') piSend(msg.cmd);
      if (msg.type === 'start') startPi(msg.opts);
      if (msg.type === 'kill') killPi();
      
      // Terminal command execution
      if (msg.type === 'run_command') {
        if (activeCmdProc) { try { activeCmdProc.kill(); } catch (e) {} activeCmdProc = null; }
        const targetCwd = msg.cwd || process.cwd();
        console.log(`Spawning terminal process in: ${targetCwd} - Command: ${msg.cmdStr}`);
        activeCmdProc = spawn(msg.cmdStr, { shell: true, cwd: targetCwd });
        activeCmdProc.stdout.on('data', chunk => {
          broadcast({ type: 'cmd_out', msg: chunk.toString() });
        });
        activeCmdProc.stderr.on('data', chunk => {
          broadcast({ type: 'cmd_out', msg: chunk.toString() });
        });
        activeCmdProc.on('exit', code => {
          activeCmdProc = null;
          broadcast({ type: 'cmd_exit', code });
        });
      }
      if (msg.type === 'kill_command') {
        if (activeCmdProc) {
          try { activeCmdProc.kill(); } catch (e) {}
          activeCmdProc = null;
          broadcast({ type: 'cmd_out', msg: '\n[Terminal] 命令已手动中止。\n' });
          broadcast({ type: 'cmd_exit', code: -1 });
        }
      }
    } catch (e) { console.error('WebSocket message error:', e.message); }
  });
});

// API
app.get('/api/config', (req, res) => {
  const cfg = {};
  const piDir = path.join(os.homedir(), '.pi', 'agent');
  try { if (fs.existsSync(path.join(piDir, 'settings.json'))) cfg.settings = JSON.parse(fs.readFileSync(path.join(piDir, 'settings.json'), 'utf-8')); } catch (e) { console.error('Failed to read settings.json:', e.message); }
  try { if (fs.existsSync(path.join(piDir, 'models.json'))) cfg.models = JSON.parse(fs.readFileSync(path.join(piDir, 'models.json'), 'utf-8')); } catch (e) { console.error('Failed to read models.json:', e.message); }
  // auth.json intentionally excluded — contains API keys, must not be served to the browser
  cfg.alive = !!piProc;
  res.json(cfg);
});

app.post('/api/config', (req, res) => {
  try {
    const piDir = path.join(os.homedir(), '.pi', 'agent');
    const body = req.body;
    if (body.settings) fs.writeFileSync(path.join(piDir, 'settings.json'), JSON.stringify(body.settings, null, 2));
    if (body.models) fs.writeFileSync(path.join(piDir, 'models.json'), JSON.stringify(body.models, null, 2));
    // auth.json writes blocked — API keys should be configured via CLI, not the web UI
    res.json({ ok: true });
  } catch (e) {
    console.error('Failed to save config:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/files', (req, res) => {
  const dir = safePath(req.query.path);
  if (!dir || !fs.existsSync(dir)) return res.json([]);
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true }).map(d => ({ name: d.name, isDir: d.isDirectory(), path: path.join(dir, d.name) }));
    res.json(items);
  } catch (e) { console.error('Failed to read directory:', e.message); res.json([]); }
});

app.get('/api/file', (req, res) => {
  const p = safePath(req.query.path);
  if (!p) return res.status(400).json({ error: 'path required or not allowed' });
  try { res.json({ content: fs.readFileSync(p, 'utf-8') }); } catch (e) { res.status(404).json({ error: 'not found' }); }
});

app.post('/api/file', (req, res) => {
  const p = safePath(req.body.path);
  if (!p) return res.status(400).json({ error: 'path required or not allowed' });
  try { fs.writeFileSync(p, req.body.content, 'utf-8'); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/search', async (req, res) => {
  const { q, path: dir } = req.query;
  const safeDir = safePath(dir);
  if (!q || !safeDir) return res.json([]);
  try {
    await fs.promises.access(safeDir);
  } catch { return res.json([]); }

  const MAX_FILE_SIZE = 512 * 1024; // 512KB
  const MAX_RESULTS = 100;
  const SKIP_DIRS = new Set(['node_modules', '.git', '.pi', 'dist', '.next', '__pycache__']);
  const results = [];

  async function searchDir(d) {
    let items;
    try { items = await fs.promises.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const item of items) {
      if (results.length >= MAX_RESULTS) return;
      const fp = path.join(d, item.name);
      if (item.isDirectory()) {
        if (SKIP_DIRS.has(item.name)) continue;
        await searchDir(fp);
      } else {
        try {
          const stat = await fs.promises.stat(fp);
          if (stat.size > MAX_FILE_SIZE) continue;
          const content = await fs.promises.readFile(fp, 'utf-8');
          if (content.includes(q)) {
            const lines = content.split('\n');
            for (let idx = 0; idx < lines.length; idx++) {
              if (lines[idx].includes(q)) {
                results.push({ path: fp.replace(/\\/g, '/'), file: item.name, line: idx + 1, text: lines[idx].trim() });
                if (results.length >= MAX_RESULTS) return;
              }
            }
          }
        } catch {}
      }
    }
  }

  try {
    await searchDir(safeDir);
    res.json(results);
  } catch (e) { console.error('Search error:', e.message); res.json([]); }
});

app.get('/api/sessions', (req, res) => {
  const dir = path.join(os.homedir(), '.pi', 'agent', 'sessions');
  try {
    if (!fs.existsSync(dir)) return res.json([]);
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const sessions = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dp = path.join(dir, entry.name);
        const files = fs.readdirSync(dp).filter(f => f.endsWith('.jsonl'));
        for (const f of files) { const s = fs.statSync(path.join(dp, f)); sessions.push({ name: entry.name, file: f, path: path.join(dp, f), modified: s.mtimeMs, size: s.size }); }
      }
    }
    res.json(sessions.sort((a, b) => b.modified - a.modified).slice(0, 50));
  } catch (e) { res.json([]); }
});

app.get('/api/session-detail', (req, res) => {
  const p = safePath(req.query.path);
  if (!p || !fs.existsSync(p)) return res.status(404).json({ error: 'Session not found' });
  try {
    const content = fs.readFileSync(p, 'utf-8');
    const lines = content.split('\n');
    const messages = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        if (obj.type === 'message') {
          messages.push(obj.message);
        }
      } catch (e) {}
    }
    res.json({ messages });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/session-detail', (req, res) => {
  const p = safePath(req.query.path);
  if (!p || !fs.existsSync(p)) return res.status(404).json({ error: 'Session not found' });
  try {
    fs.unlinkSync(p);
    // Cleanup parent directory if empty
    const parentDir = path.dirname(p);
    const files = fs.readdirSync(parentDir);
    if (files.length === 0) {
      fs.rmdirSync(parentDir);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3456;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[FATAL ERROR] Port ${PORT} is already in use.`);
    console.error(`This typically means another instance of PI-CY (or node/electron) is running.`);
    console.error(`Please close any other running instances, or kill them to free up the port.\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`PI-CY running at http://localhost:${PORT}`);
  startPi({ provider: 'xiaomi-token-plan-cn', model: 'mimo-v2.5-pro', thinking: 'medium' });
});

process.on('SIGINT', () => { killPi(); if (activeCmdProc) { try { activeCmdProc.kill(); } catch (e) {} } process.exit(0); });
process.on('exit', () => { killPi(); if (activeCmdProc) { try { activeCmdProc.kill(); } catch (e) {} } });

module.exports = { killPi, startPi };
