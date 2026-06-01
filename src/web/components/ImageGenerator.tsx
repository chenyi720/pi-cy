import { useState, useEffect } from "react";

interface Props {
  onImageGenerated?: (imagePath: string) => void;
}

interface GeneratedImage {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  seed: number;
  timestamp: number;
  imagePath: string;
}

export function ImageGenerator({ onImageGenerated }: Props) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("blurry, low quality, distorted");
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ imagePath: string; seed: number } | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = () => {
    setLoadingHistory(true);
    fetch("/api/comfyui/history")
      .then((r) => r.json())
      .then((data: GeneratedImage[]) => {
        setHistory(data);
        setLoadingHistory(false);
      })
      .catch(() => setLoadingHistory(false));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/comfyui/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, negativePrompt, width, height, steps }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        onImageGenerated?.(data.imagePath);
        fetchHistory(); // Refresh history
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleUseParams = (img: GeneratedImage) => {
    setPrompt(img.prompt);
    setNegativePrompt(img.negativePrompt);
    setWidth(img.width);
    setHeight(img.height);
    setSteps(img.steps);
  };

  return (
    <div className="flex flex-col h-full bg-white/20 dark:bg-gray-900/20 backdrop-blur-md">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/30 dark:border-gray-700/30 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          图片生成 (HiDream O1)
        </span>
        <button
          onClick={fetchHistory}
          className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          刷新历史
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Form settings */}
        <div className="bg-white/40 dark:bg-gray-855/40 p-3 rounded-xl border border-white/50 dark:border-gray-700/30 space-y-2.5 shadow-sm">
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">正向提示词</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想生成的图片..."
              rows={3}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/40 dark:border-gray-650 bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">反向提示词</label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/40 dark:border-gray-650 bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <label className="text-[10px] text-gray-400 mb-1 block">宽度</label>
              <select
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full text-[10px] px-1 py-1 rounded border border-white/40 dark:border-gray-650 bg-white/50 dark:bg-gray-800/50 focus:outline-none dark:text-white"
              >
                {[512, 768, 1024, 1536, 2048].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] text-gray-400 mb-1 block">高度</label>
              <select
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full text-[10px] px-1 py-1 rounded border border-white/40 dark:border-gray-650 bg-white/50 dark:bg-gray-800/50 focus:outline-none dark:text-white"
              >
                {[512, 768, 1024, 1536, 2048].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] text-gray-400 mb-1 block">步数</label>
              <select
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                className="w-full text-[10px] px-1 py-1 rounded border border-white/40 dark:border-gray-650 bg-white/50 dark:bg-gray-800/50 focus:outline-none dark:text-white"
              >
                {[0, 20, 28, 35, 50].map((v) => (
                  <option key={v} value={v}>{v ? v : "自动"}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            className="w-full py-1.5 text-xs font-medium rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white shadow-sm transition-all"
          >
            {generating ? "✨ 正在渲染图片..." : "🎨 生成图片"}
          </button>

          {error && (
            <div className="text-[10px] text-red-500 bg-red-50/50 dark:bg-red-900/20 border border-red-200/30 rounded p-2">{error}</div>
          )}
        </div>

        {/* Latest Result */}
        {result && (
          <div className="bg-white/50 dark:bg-gray-855/50 border border-white/40 dark:border-gray-700/30 rounded-xl p-3 shadow-sm">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">生成结果</div>
            <div className="text-[9px] text-gray-400 mb-1">随机种子: {result.seed}</div>
            <img
              src={`/api/comfyui/image?path=${encodeURIComponent(result.imagePath)}`}
              alt="生成的图片"
              className="w-full rounded-lg border border-white/30 dark:border-gray-750 shadow-sm"
            />
          </div>
        )}

        {/* History Gallery */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">生成历史 ({history.length})</div>
          
          {loadingHistory && history.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-4">加载历史中...</div>
          ) : history.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-4">暂无生成历史</div>
          ) : (
            <div className="space-y-3">
              {history.map((img) => (
                <div
                  key={img.timestamp}
                  className="bg-white/60 dark:bg-gray-850/60 border border-white/40 dark:border-gray-700/40 rounded-xl p-2.5 shadow-sm hover:bg-white/80 dark:hover:bg-gray-850/80 transition-all flex gap-2.5 items-start"
                >
                  <img
                    src={`/api/comfyui/image?path=${encodeURIComponent(img.imagePath)}`}
                    alt="历史生成图片"
                    className="w-16 h-16 object-cover rounded-lg border border-white/30 dark:border-gray-750 shadow-sm"
                  />
                  <div className="flex-1 min-w-0 text-[10px] space-y-1">
                    <div className="text-gray-800 dark:text-gray-200 line-clamp-2" title={img.prompt}>
                      {img.prompt}
                    </div>
                    <div className="text-gray-400 text-[9px] flex gap-2">
                      <span>{img.width}x{img.height}</span>
                      <span>步数: {img.steps}</span>
                      <span>种子: {img.seed}</span>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        onClick={() => handleUseParams(img)}
                        className="text-[9px] px-1.5 py-0.5 border border-white/40 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-850/80 rounded transition-all text-gray-750 dark:text-gray-300 shadow-sm"
                      >
                        使用参数
                      </button>
                      <a
                        href={`/api/comfyui/image?path=${encodeURIComponent(img.imagePath)}`}
                        download={`pi-cy-${img.timestamp}.png`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] px-1.5 py-0.5 border border-white/40 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-850/80 rounded transition-all text-gray-750 dark:text-gray-300 shadow-sm"
                      >
                        下载
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
