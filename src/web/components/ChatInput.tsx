import { useState, useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";
import { sendChat } from "../api/ws";
import { addUserMessage, useChatStore } from "../stores/chat";

interface AttachedImage {
  base64: string;
  mimeType: string;
  preview: string;
}

export function ChatInput() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<AttachedImage | null>(null);
  const { isAgentRunning } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSend = () => {
    const trimmed = text.trim();
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
    <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border-t border-white/30 dark:border-gray-700/30 px-4 py-3 shadow-[0_-4px_30px_rgba(0,0,0,0.02)]">
      {image && (
        <div className="relative inline-block mb-2">
          <img
            src={image.preview}
            alt="Attached"
            className="max-h-32 rounded border border-white/40 dark:border-gray-650"
          />
          <button
            onClick={() => setImage(null)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
          >
            x
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
          className="px-2 py-2 rounded-xl border border-white/40 dark:border-gray-600/40 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80 disabled:opacity-50 transition-colors shadow-sm"
          title="上传图片（或 Ctrl+V 粘贴）"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          placeholder={image ? "描述图片或输入问题..." : "输入消息...（Shift+Enter 换行）"}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-white/40 dark:border-gray-650/40 bg-white/70 dark:bg-gray-850/70 backdrop-blur-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white placeholder-gray-400 shadow-sm"
          disabled={isAgentRunning}
        />
        <button
          onClick={handleSend}
          disabled={(!text.trim() && !image) || isAgentRunning}
          className="px-4 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(37,99,235,0.15)]"
        >
          {isAgentRunning ? "..." : "发送"}
        </button>
      </div>
    </div>
  );
}
