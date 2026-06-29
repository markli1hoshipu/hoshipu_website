import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders our docs/*.md sources as styled HTML. shadcn + Tailwind v4 doesn't
 * ship typography defaults, so we apply per-element classes via the component
 * overrides instead of @tailwindcss/typography (one less dep).
 */
export function MarkdownArticle({ content }: { content: string }) {
  return (
    <article className="space-y-4 text-sm text-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 border-b border-slate-200 pb-1 text-lg font-semibold text-slate-900">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 text-base font-semibold text-slate-800">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-4 text-sm font-semibold text-slate-800">{children}</h4>
          ),
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-6">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="font-medium text-indigo-600 hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ children, ...props }) => {
            const inline = !(props as { inline?: boolean }).inline === false;
            // Inline code: short pill. Block code: handled by `pre`.
            return inline ? (
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800">
                {children}
              </code>
            ) : (
              <code className="font-mono text-[0.85em]">{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-slate-200 px-3 py-1.5 text-left font-semibold text-slate-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 px-3 py-1.5 align-top">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-300 pl-3 italic text-slate-600">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
