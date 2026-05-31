export interface RpcStartOptions {
  provider?: string;
  model?: string;
  thinking?: string;
  session?: string;
  systemPrompt?: string;
  cwd?: string;
}

export interface WsMessage {
  type: string;
  [key: string]: unknown;
}

export interface SessionInfo {
  name: string;
  file: string;
  path: string;
  modified: number;
  size: number;
}

export interface FileEntry {
  name: string;
  isDir: boolean;
  path: string;
}

export interface SearchResult {
  path: string;
  file: string;
  line: number;
  text: string;
}
