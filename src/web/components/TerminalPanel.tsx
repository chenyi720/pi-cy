import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import "xterm/css/xterm.css";
import { sendWs, onWsMessage } from "../api/ws";

export function TerminalPanel() {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!termRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "Consolas, 'Courier New', monospace",
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
        selectionBackground: "#264f78",
      },
      rows: 24,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);
    requestAnimationFrame(() => {
      try { fitAddon.fit(); } catch { /* container not ready */ }
    });

    xtermRef.current = term;
    fitRef.current = fitAddon;

    let currentLine = "";

    term.onData((data) => {
      if (data === "\r") {
        sendWs({
          type: "run_command",
          cmdStr: currentLine,
          cwd: undefined,
        });
        currentLine = "";
        term.write("\r\n");
      } else if (data === "\x7f") {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write("\b \b");
        }
      } else if (data >= " ") {
        currentLine += data;
        term.write(data);
      }
    });

    const unsub = onWsMessage((msg) => {
      const type = msg.type as string;
      if (type === "cmd_out") {
        const text = msg.msg as string;
        if (text) {
          term.write(text.replace(/\n/g, "\r\n"));
        }
      } else if (type === "cmd_exit") {
        const code = msg.code as number;
        term.write(`\r\n[进程退出，代码 ${code}]\r\n$ `);
        setConnected(false);
      }
    });

    setConnected(true);
    term.write("$ ");

    const handleResize = () => {
      try { fitAddon.fit(); } catch { /* ignore */ }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      unsub();
      term.dispose();
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          终端
        </div>
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-400"}`} />
          <span className="text-[10px] text-gray-400">{connected ? "就绪" : "断开"}</span>
        </div>
      </div>
      <div ref={termRef} className="flex-1 p-1" />
    </div>
  );
}
