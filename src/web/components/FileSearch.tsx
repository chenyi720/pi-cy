import { useState, useRef, useEffect } from "react";

interface SearchResult {
  path: string;
  file: string;
  line: number;
  text: string;
}

interface Props {
  rootPath: string;
  onResultClick: (path: string) => void;
}

export function FileSearch({ rootPath, onResultClick }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}&path=${encodeURIComponent(rootPath)}`)
        .then((r) => r.json())
        .then((data: SearchResult[]) => setResults(data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
  }, [query, rootPath]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">搜索</div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索文件内容..."
          className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-3 py-4 text-center text-sm text-gray-400">搜索中...</div>
        )}
        {!loading && query && results.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-gray-400">无结果</div>
        )}
        {results.map((r, i) => (
          <button
            key={`${r.path}-${r.line}-${i}`}
            onClick={() => onResultClick(r.path)}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800"
          >
            <div className="text-xs text-gray-500 truncate">{r.path}</div>
            <div className="flex gap-2 text-sm">
              <span className="text-gray-400 shrink-0">:{r.line}</span>
              <span className="truncate font-mono text-gray-700 dark:text-gray-300">{r.text}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
