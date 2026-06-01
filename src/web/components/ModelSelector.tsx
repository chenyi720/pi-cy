import { useState, useEffect } from "react";

interface ModelInfo {
  provider: string;
  id: string;
  name: string;
  context: string;
  maxTokens: string;
  reasoning: string;
  images: string;
}

export function ModelSelector() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentModel, setCurrentModel] = useState("mimo-v2.5-pro");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data: ModelInfo[]) => {
        const miMo = data.filter((m) => m.provider === "xiaomi-token-plan-cn");
        setModels(miMo);
      })
      .catch(() => {});
  }, []);

  const handleSelect = (modelId: string) => {
    setCurrentModel(modelId);
    setOpen(false);
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        const settings = data.settings || {};
        settings.defaultModel = modelId;
        fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings }),
        });
      });
  };

  const current = models.find((m) => m.id === currentModel);
  const label = current?.name || currentModel;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
      >
        {label}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-64 max-h-60 overflow-y-auto">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => handleSelect(m.id)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${
                m.id === currentModel ? "bg-blue-50 dark:bg-blue-900/20" : ""
              }`}
            >
              <div className="font-medium text-gray-800 dark:text-gray-200">{m.name}</div>
              <div className="text-gray-400 text-[10px]">
                {m.reasoning === "yes" ? "推理 " : ""}
                {m.images === "yes" ? "识图 " : ""}
                {m.context}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
