type WsHandler = (msg: Record<string, unknown>) => void;

let ws: WebSocket | null = null;
const handlers = new Set<WsHandler>();

export function connectWs(): WebSocket {
  if (ws && ws.readyState === WebSocket.OPEN) return ws;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => console.log("WebSocket connected");
  ws.onclose = () => {
    console.log("WebSocket disconnected, reconnecting in 2s...");
    setTimeout(connectWs, 2000);
  };
  ws.onerror = (e) => console.error("WebSocket error:", e);
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as Record<string, unknown>;
      for (const handler of handlers) handler(msg);
    } catch { /* ignore */ }
  };

  return ws;
}

export function onWsMessage(handler: WsHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function sendWs(msg: Record<string, unknown>): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function startAgent(opts: {
  provider?: string;
  model?: string;
  thinking?: string;
  cwd?: string;
}): void {
  sendWs({ type: "start", opts });
}

export function sendPrompt(text: string): void {
  sendWs({ type: "chat", text });
}

export function sendChat(text: string, image?: string, mimeType?: string): void {
  sendWs({ type: "chat", text, image, mimeType });
}

export function killAgent(): void {
  sendWs({ type: "kill" });
}
