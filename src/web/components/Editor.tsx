import Editor, { DiffEditor, type OnMount } from "@monaco-editor/react";
import { useRef, useCallback, useState } from "react";
import { executeToolApi } from "../api/tools";

interface Props {
  filePath: string;
  content: string;
  language?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onSave?: (content: string) => void;
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

export function CodeEditor({ filePath, content, language, readOnly = true, onChange, onSave }: Props) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!editorRef.current || !onSave) return;
    const value = editorRef.current.getValue();
    setSaving(true);
    setSaveStatus(null);
    try {
      const result = await executeToolApi("write_file", { path: filePath, content: value });
      if (result.error) {
        setSaveStatus(`错误: ${result.error}`);
      } else {
        setSaveStatus("已保存");
        onSave(value);
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch (e) {
      setSaveStatus(`错误: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [filePath, onSave]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    if (!readOnly && onSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        handleSave();
      });
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {!readOnly && onSave && (
        <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-b border-gray-700">
          <span className="text-[10px] text-gray-400 font-mono">{filePath}</span>
          <div className="flex items-center gap-2">
            {saveStatus && (
              <span className={`text-[10px] ${saveStatus.startsWith("错误") ? "text-red-400" : "text-green-400"}`}>
                {saveStatus}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-2 py-0.5 text-[10px] rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存 (Ctrl+S)"}
            </button>
          </div>
        </div>
      )}
      <div className="flex-1">
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
