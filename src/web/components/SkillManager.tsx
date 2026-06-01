import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";

interface SkillDefinition {
  name: string;
  description: string;
  path: string;
  content: string;
  triggers?: string[];
}

export function SkillManager() {
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<SkillDefinition | null>(null);
  
  // Editor form state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTriggers, setEditTriggers] = useState("");
  const [editContent, setEditContent] = useState("");

  // Test sandbox state
  const [testArgsJson, setTestArgsJson] = useState('{\n  "param1": "value1"\n}');
  const [invoking, setInvoking] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchSkills = () => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data: SkillDefinition[]) => {
        setSkills(data || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const filtered = skills.filter(
    (s) =>
      !filter ||
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase()),
  );

  const handleSelectSkill = (skill: SkillDefinition) => {
    setSelectedSkill(skill);
    setIsEditing(true);
    setEditName(skill.name);
    setEditDesc(skill.description);
    setEditTriggers(skill.triggers?.join(", ") || "");
    setEditContent(skill.content || "");
    setTestResult(null);
  };

  const handleNewSkill = () => {
    setSelectedSkill(null);
    setIsEditing(true);
    setEditName("");
    setEditDesc("");
    setEditTriggers("");
    setEditContent(
      "# 技能说明与系统提示词\n\n您可以使用这个自定义技能让 AI 按特定指令开发。例如：\n- 运行类型检查\n- 生成模版页面\n\n可以使用参数，如 `{{param1}}`"
    );
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!editName.trim() || !editContent.trim()) return;

    const triggers = editTriggers
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
          triggers,
          content: editContent,
        }),
      });
      if (res.ok) {
        fetchSkills();
        setIsEditing(false);
        setSelectedSkill(null);
      }
    } catch (err) {
      console.error("Failed to save skill", err);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`确定要删除自定义技能 /${name} 吗？`)) return;
    try {
      const res = await fetch(`/api/skills/${name}`, { method: "DELETE" });
      if (res.ok) {
        fetchSkills();
        setIsEditing(false);
        setSelectedSkill(null);
      }
    } catch (err) {
      console.error("Failed to delete skill", err);
    }
  };

  const handleTestInvoke = async () => {
    if (!editName.trim()) return;
    setInvoking(true);
    setTestResult(null);

    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(testArgsJson);
    } catch (err) {
      setTestResult(`参数 JSON 格式错误: ${(err as Error).message}`);
      setInvoking(false);
      return;
    }

    try {
      const res = await fetch("/api/skills/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), args: parsedArgs }),
      });
      const data = await res.json();
      setTestResult(data.content || data.error || "调用成功，但无输出");
    } catch (e) {
      setTestResult(`Error: ${(e as Error).message}`);
    } finally {
      setInvoking(false);
    }
  };

  return (
    <div className="flex h-full bg-white/20 dark:bg-gray-900/20 backdrop-blur-md font-sans">
      {/* Left Pane - Skills List */}
      <div className="w-1/3 border-r border-white/30 dark:border-gray-750 flex flex-col h-full">
        <div className="p-3 border-b border-white/30 dark:border-gray-750 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              系统指令技能 ({skills.length})
            </span>
            <button
              onClick={handleNewSkill}
              className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2 py-1 rounded shadow-sm transition-all"
            >
              + 新建技能
            </button>
          </div>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="搜索触发词或描述..."
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((skill) => {
            const isSelected = selectedSkill?.name === skill.name;
            return (
              <div
                key={skill.name}
                className={`p-3 border-b border-gray-100 dark:border-gray-800/50 cursor-pointer hover:bg-white/40 dark:hover:bg-gray-800/30 transition-all ${
                  isSelected ? "bg-blue-50/50 dark:bg-blue-900/20" : ""
                }`}
                onClick={() => handleSelectSkill(skill)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    /{skill.name}
                  </span>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleSelectSkill(skill)}
                      className="text-[9px] text-gray-500 dark:text-gray-400 hover:text-blue-500"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(skill.name)}
                      className="text-[9px] text-red-500/80 hover:text-red-500"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                  {skill.description}
                </div>
                {skill.triggers && skill.triggers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {skill.triggers.map((t) => (
                      <span
                        key={t}
                        className="text-[8px] bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Pane - Monaco Editor & Sandbox */}
      <div className="w-2/3 flex flex-col h-full">
        {isEditing ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Editor settings */}
            <div className="p-4 border-b border-white/30 dark:border-gray-750 bg-white/40 dark:bg-gray-850/30 space-y-3">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-250">
                {selectedSkill ? `编辑技能: /${selectedSkill.name}` : "创建自定义技能"}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 uppercase font-bold">技能标识 (Name)</label>
                  <input
                    type="text"
                    disabled={!!selectedSkill}
                    placeholder="例如: compile-check"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 focus:outline-none dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 uppercase font-bold">描述 (Description)</label>
                  <input
                    type="text"
                    placeholder="描述此技能的作用..."
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 focus:outline-none dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 uppercase font-bold">触发词 (Triggers, 逗号分隔)</label>
                  <input
                    type="text"
                    placeholder="例如: check, lint"
                    value={editTriggers}
                    onChange={(e) => setEditTriggers(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 focus:outline-none dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="flex-1 min-h-[200px] border-b border-white/30 dark:border-gray-750 relative">
              <Editor
                height="100%"
                language="markdown"
                value={editContent}
                onChange={(val) => setEditContent(val || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 12.5,
                  wordWrap: "on",
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>

            {/* Sandbox Tester & Controls */}
            <div className="p-4 bg-white/40 dark:bg-gray-850/30 space-y-3 max-h-[250px] overflow-y-auto">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-350">测试沙盒 (Sandbox Sandbox)</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleTestInvoke}
                    disabled={invoking}
                    className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all"
                  >
                    {invoking ? "运行中..." : "🧪 运行测试"}
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm transition-all"
                  >
                    保存并部署
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 text-xs rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 hover:dark:bg-gray-700 transition-all"
                  >
                    取消
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 font-bold uppercase">模拟调用参数 (JSON)</label>
                  <textarea
                    value={testArgsJson}
                    onChange={(e) => setTestArgsJson(e.target.value)}
                    rows={4}
                    className="w-full text-[10px] font-mono p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 focus:outline-none dark:text-white"
                  />
                </div>
                <div className="space-y-1 flex flex-col h-full">
                  <label className="text-[9px] text-gray-400 font-bold uppercase">测试输出结果 (Result)</label>
                  <div className="flex-1 bg-gray-950 text-green-400 p-2 rounded-lg font-mono text-[9px] border border-gray-900 overflow-y-auto leading-normal whitespace-pre-wrap max-h-24">
                    {testResult || "(等待运行测试...)"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs p-6">
            <span className="text-2xl mb-2">⚡</span>
            请在左侧选择技能进行修改，或者点击“新建技能”创建新指令工作流。
          </div>
        )}
      </div>
    </div>
  );
}
