import { useChangeStore, clearChanges, removeFileChange } from "../stores/changes";

interface ChangePanelProps {
  onFileClick: (path: string) => void;
}

export function ChangePanel({ onFileClick }: ChangePanelProps) {
  const { changedFiles } = useChangeStore();
  const files = Array.from(changedFiles);

  if (files.length === 0) {
    return (
      <div className="p-3 text-center text-xs text-gray-400">
        暂无文件变更
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-semibold text-gray-500">
          变更文件 ({files.length})
        </span>
        <button
          onClick={clearChanges}
          className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          清除全部
        </button>
      </div>
      <div className="overflow-y-auto">
        {files.map((filePath) => {
          const fileName = filePath.split(/[/\\]/).pop() || filePath;
          return (
            <div
              key={filePath}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 group"
            >
              <span className="text-orange-500 text-xs">●</span>
              <button
                onClick={() => onFileClick(filePath)}
                className="flex-1 text-left text-xs text-gray-700 dark:text-gray-300 truncate"
                title={filePath}
              >
                {fileName}
              </button>
              <button
                onClick={() => removeFileChange(filePath)}
                className="text-[10px] text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
