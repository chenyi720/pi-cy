import { useState, useEffect } from "react";

interface SkillInfo {
  name: string;
  description: string;
  path: string;
}

export function SkillManager() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [invoking, setInvoking] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data: SkillInfo[]) => setSkills(data))
      .catch(() => {});
  }, []);

  const filtered = skills.filter(
    (s) =>
      !filter ||
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase()),
  );

  const handleInvoke = async (name: string) => {
    setInvoking(true);
    setResult(null);
    try {
      const res = await fetch("/api/skills/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      setResult(data.content || data.error || "No result");
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    } finally {
      setInvoking(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          技能管理 ({skills.length})
        </div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="搜索技能..."
          className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map((skill) => (
          <div
            key={skill.name}
            className={`px-3 py-2 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
              selected === skill.name ? "bg-blue-50 dark:bg-blue-900/20" : ""
            }`}
            onClick={() => setSelected(selected === skill.name ? null : skill.name)}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                /{skill.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleInvoke(skill.name);
                }}
                disabled={invoking}
                className="px-2 py-0.5 text-[10px] rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                调用
              </button>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
              {skill.description}
            </div>
          </div>
        ))}
      </div>

      {result && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500">技能输出</span>
            <button
              onClick={() => setResult(null)}
              className="text-[10px] text-gray-400 hover:text-gray-600"
            >
              关闭
            </button>
          </div>
          <pre className="text-[10px] font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900 rounded p-2">
            {result.slice(0, 3000)}
          </pre>
        </div>
      )}
    </div>
  );
}
