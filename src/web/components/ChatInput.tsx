import { useState, useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";
import { sendChat, killAgent } from "../api/ws";
import { addUserMessage, useChatStore, clearMessages } from "../stores/chat";

interface AttachedImage {
  base64: string;
  mimeType: string;
  preview: string;
}

const SLASH_COMMANDS = [
  { cmd: "/generate_image", desc: "调用 ComfyUI 艺术生成设计/前端 Mock 蓝图" },
  { cmd: "/run_plan", desc: "执行多步骤自主编排计划" },
  { cmd: "/run_swarm", desc: "启动多智能体协同流水线 (Coder ⇄ Reviewer)" },
  { cmd: "/clear", desc: "清空当前对话会话历史" },
];

export function ChatInput() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<AttachedImage | null>(null);
  const { isAgentRunning } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-complete dropdown states
  const [menuType, setMenuType] = useState<"none" | "slash" | "at">("none");
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const readFileAsBase64 = useCallback((file: File): Promise<AttachedImage> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] || "";
        resolve({
          base64,
          mimeType: file.type || "image/png",
          preview: result,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const img = await readFileAsBase64(file);
      setImage(img);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [readFileAsBase64],
  );

  const handlePaste = useCallback(
    async (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const img = await readFileAsBase64(file);
            setImage(img);
          }
          return;
        }
      }
    },
    [readFileAsBase64],
  );

  const handleFileSearch = useCallback(async (query: string) => {
    try {
      const res = await fetch(`/api/workspace-files?q=${encodeURIComponent(query)}`);
      const files = await res.json();
      setFilteredFiles(files || []);
    } catch {
      setFilteredFiles([]);
    }
  }, []);

  const handleTextChange = (val: string) => {
    setText(val);

    const el = textareaRef.current;
    if (!el) return;
    const cursorPos = el.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const words = textBeforeCursor.split(/[\s\n]/);
    const lastWord = words[words.length - 1] || "";

    if (lastWord.startsWith("/")) {
      setMenuType("slash");
      setSelectedIndex(0);
    } else if (lastWord.startsWith("@")) {
      setMenuType("at");
      setSelectedIndex(0);
      handleFileSearch(lastWord.slice(1));
    } else {
      setMenuType("none");
    }
  };

  const selectItem = (insertedText: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const cursorPos = el.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const textAfterCursor = text.slice(cursorPos);

    const words = textBeforeCursor.split(/[\s\n]/);
    words.pop(); // Remove the slash or at token

    const newTextBefore = words.join(" ") + (words.length > 0 ? " " : "") + insertedText + " ";
    setText(newTextBefore + textAfterCursor);
    setMenuType("none");

    setTimeout(() => {
      el.focus();
      const newPos = newTextBefore.length;
      el.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed === "/clear") {
      clearMessages();
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      return;
    }

    if ((!trimmed && !image) || isAgentRunning) return;

    const displayText = trimmed || (image ? "请分析这张图片" : "");
    addUserMessage(displayText);

    if (image) {
      sendChat(displayText, image.base64, image.mimeType);
    } else {
      sendChat(trimmed);
    }

    setText("");
    setImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (menuType !== "none") {
      const listLength = menuType === "slash" ? SLASH_COMMANDS.length : filteredFiles.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % listLength);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + listLength) % listLength);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (listLength > 0) {
          if (menuType === "slash") {
            selectItem(SLASH_COMMANDS[selectedIndex].cmd);
          } else {
            selectItem(`@${filteredFiles[selectedIndex]}`);
          }
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMenuType("none");
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/5 px-5 py-4">
      
      {/* Floating autocomplete dropdown */}
      {menuType !== "none" && (
        <div className="absolute bottom-full left-4 right-4 mb-2 max-h-52 overflow-y-auto rounded-xl border border-white/20 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl p-1.5 shadow-xl z-50">
          {menuType === "slash" && SLASH_COMMANDS.map((item, index) => (
            <button
              key={item.cmd}
              onClick={() => selectItem(item.cmd)}
              className={`w-full flex flex-col text-left px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                index === selectedIndex
                  ? "bg-blue-600 text-white font-medium shadow-sm"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
              }`}
            >
              <span className="font-mono text-xs font-bold">{item.cmd}</span>
              <span className={`text-[10px] mt-0.5 ${index === selectedIndex ? "text-blue-100" : "text-gray-400 dark:text-gray-500"}`}>
                {item.desc}
              </span>
            </button>
          ))}

          {menuType === "at" && filteredFiles.map((file, index) => (
            <button
              key={file}
              onClick={() => selectItem(`@${file}`)}
              className={`w-full flex items-center px-3 py-1.5 rounded-lg transition-colors text-left font-mono text-xs cursor-pointer ${
                index === selectedIndex
                  ? "bg-blue-600 text-white font-medium shadow-sm"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
              }`}
            >
              <span className="mr-2">📄</span>
              <span className="truncate flex-1">{file}</span>
            </button>
          ))}

          {menuType === "at" && filteredFiles.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-450 dark:text-gray-500 font-mono text-center">
              未找到匹配的工作区文件
            </div>
          )}
        </div>
      )}

      {/* Image attachments */}
      {image && (
        <div className="relative inline-block mb-2 animate-fade-in">
          <img
            src={image.preview}
            alt="Attached"
            className="max-h-32 rounded border border-white/40 dark:border-gray-650"
          />
          <button
            onClick={() => setImage(null)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 shadow"
          >
            ✕
          </button>
          <div className="text-[10px] text-gray-400 mt-0.5">
            将使用 mimo-v2.5 识图
          </div>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isAgentRunning}
          className="px-2 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          title="上传图片（或 Ctrl+V 粘贴）"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          placeholder={image ? "描述图片或输入问题..." : "输入消息... 输入 / 指令，输入 @ 提及代码文件"}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-white/20 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm transition-all"
          disabled={isAgentRunning}
        />
        <button
          onClick={isAgentRunning ? () => killAgent() : handleSend}
          disabled={(!text.trim() && !image) && !isAgentRunning}
          className={isAgentRunning
            ? "w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-zinc-200 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center justify-center"
            : "px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-zinc-200 active:scale-95 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1 min-w-[70px]"
          }
        >
          {isAgentRunning ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          ) : "发送"}
        </button>
      </div>
      {/* Status bar */}
      <div className="flex items-center gap-3 px-1 text-[11px] text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          Claude
        </span>
        <span className="flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit automatically
        </span>
      </div>
    </div>
  );
}
