import { useEffect, useRef } from "react";
import { marked } from "marked";
import hljs from "highlight.js";

marked.setOptions({
  gfm: true,
  breaks: true,
});

const renderer = new marked.Renderer();
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

interface Props {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = marked.parse(content, { renderer }) as string;
    }
  }, [content]);

  return <div ref={ref} className={`markdown-body ${className || ""}`} />;
}
