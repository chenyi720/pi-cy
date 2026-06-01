import { useSyncExternalStore } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
  thinkingContent?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  status: "running" | "success" | "error";
  startTime: number;
  endTime?: number;
}

interface ChatState {
  messages: ChatMessage[];
  isAgentRunning: boolean;
  currentModel: string;
  currentProvider: string;
  tokenUsage: { input: number; output: number; total: number } | null;
  error: string | null;
}

const state: ChatState = {
  messages: [],
  isAgentRunning: false,
  currentModel: "mimo-v2.5-pro",
  currentProvider: "xiaomi-token-plan-cn",
  tokenUsage: null,
  error: null,
};

const listeners = new Set<() => void>();

function emitChange(): void {
  for (const l of listeners) l();
}

function setState(partial: Partial<ChatState>): void {
  Object.assign(state, partial);
  emitChange();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): ChatState {
  return state;
}

export function useChatStore(): ChatState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

let msgIdCounter = 0;
function nextId(): string {
  return `msg-${++msgIdCounter}-${Date.now()}`;
}

export function addUserMessage(text: string): void {
  const msg: ChatMessage = {
    id: nextId(),
    role: "user",
    content: text,
    timestamp: Date.now(),
  };
  setState({ messages: [...state.messages, msg], isAgentRunning: true, error: null });
}

export function addAssistantMessageStart(): string {
  const id = nextId();
  const msg: ChatMessage = {
    id,
    role: "assistant",
    content: "",
    timestamp: Date.now(),
    isStreaming: true,
  };
  setState({ messages: [...state.messages, msg] });
  return id;
}

export function updateAssistantMessage(
  id: string,
  content: string,
  thinkingContent?: string,
): void {
  const messages = state.messages.map((m) =>
    m.id === id ? { ...m, content, thinkingContent: thinkingContent ?? m.thinkingContent } : m,
  );
  setState({ messages });
}

export function finalizeAssistantMessage(id: string): void {
  const messages = state.messages.map((m) =>
    m.id === id ? { ...m, isStreaming: false } : m,
  );
  setState({ messages, isAgentRunning: false });
}

export function addToolCallStart(
  assistantId: string,
  toolId: string,
  toolName: string,
  args: string,
): void {
  const toolCall: ToolCall = {
    id: toolId,
    name: toolName,
    arguments: args,
    status: "running",
    startTime: Date.now(),
  };
  const messages = state.messages.map((m) =>
    m.id === assistantId
      ? { ...m, toolCalls: [...(m.toolCalls || []), toolCall] }
      : m,
  );
  setState({ messages });
}

export function updateToolCallResult(
  toolId: string,
  result: string,
  status: "success" | "error",
): void {
  const messages = state.messages.map((m) => ({
    ...m,
    toolCalls: m.toolCalls?.map((tc) =>
      tc.id === toolId
        ? { ...tc, result, status, endTime: Date.now() }
        : tc,
    ),
  }));
  setState({ messages });
}

export function setTokenUsage(usage: {
  input: number;
  output: number;
  total: number;
}): void {
  setState({ tokenUsage: usage });
}

export function setError(error: string): void {
  setState({ error, isAgentRunning: false });
}

export function setModel(model: string, provider: string): void {
  setState({ currentModel: model, currentProvider: provider });
}

export function clearMessages(): void {
  setState({ messages: [], error: null, tokenUsage: null });
}

export function loadSessionMessages(rawMessages: unknown[]): void {
  const loaded: ChatMessage[] = [];
  for (const raw of rawMessages) {
    const msg = raw as Record<string, unknown>;
    const role = (msg.role as string) || "assistant";
    if (role !== "user" && role !== "assistant") continue;

    const content = typeof msg.content === "string"
      ? msg.content
      : Array.isArray(msg.content)
        ? (msg.content as Array<{ type?: string; text?: string }>)
            .filter((b) => b.type === "text" && b.text)
            .map((b) => b.text)
            .join("")
        : "";

    if (!content) continue;

    loaded.push({
      id: nextId(),
      role: role as "user" | "assistant",
      content,
      timestamp: Date.now(),
    });
  }
  if (loaded.length > 0) {
    setState({ messages: loaded, error: null, isAgentRunning: false });
  }
}
