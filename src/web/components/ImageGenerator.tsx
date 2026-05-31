import { useState } from "react";

interface Props {
  onImageGenerated?: (imagePath: string) => void;
}

export function ImageGenerator({ onImageGenerated }: Props) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("blurry, low quality, distorted");
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [steps, setSteps] = useState(20);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ imagePath: string; seed: number } | null>(null);
  const [error, setError] = useState("");

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
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Image Generation (ComfyUI)
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A beautiful sunset over mountains..."
          rows={3}
          className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Negative Prompt</label>
        <input
          type="text"
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-1 block">Width</label>
          <select
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            {[256, 384, 512, 640, 768, 1024].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-1 block">Height</label>
          <select
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            {[256, 384, 512, 640, 768, 1024].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400 mb-1 block">Steps</label>
          <select
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
            className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            {[10, 15, 20, 25, 30, 40, 50].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || generating}
        className="w-full px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {generating ? "Generating..." : "Generate Image"}
      </button>

      {error && (
        <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded p-2">{error}</div>
      )}

      {result && (
        <div className="mt-2">
          <div className="text-xs text-gray-400 mb-1">Seed: {result.seed}</div>
          <img
            src={`/api/comfyui/image?path=${encodeURIComponent(result.imagePath)}`}
            alt="Generated"
            className="w-full rounded border border-gray-200 dark:border-gray-700"
          />
        </div>
      )}
    </div>
  );
}
