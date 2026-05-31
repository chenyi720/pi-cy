import Editor, { DiffEditor, type OnMount } from "@monaco-editor/react";
import { useRef } from "react";

interface Props {
  filePath: string;
  content: string;
  language?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    json: "json", md: "markdown", css: "css", html: "html",
    py: "python", rs: "rust", go: "go", java: "java",
    sh: "shell", yml: "yaml", yaml: "yaml", toml: "toml",
    xml: "xml", sql: "sql", rb: "ruby", php: "php",
    c: "c", cpp: "cpp", h: "c", hpp: "cpp",
  };
  return langMap[ext] || "plaintext";
}

export function CodeEditor({ filePath, content, language, readOnly = true, onChange }: Props) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={language || detectLanguage(filePath)}
        value={content}
        onChange={(value) => onChange?.(value || "")}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 8 },
        }}
      />
    </div>
  );
}

interface DiffViewProps {
  original: string;
  modified: string;
  language?: string;
  filePath?: string;
}

export function DiffView({ original, modified, language, filePath }: DiffViewProps) {
  return (
    <div className="h-full w-full">
      <DiffEditor
        height="100%"
        language={language || (filePath ? detectLanguage(filePath) : "plaintext")}
        original={original}
        modified={modified}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
