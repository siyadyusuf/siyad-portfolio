import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Safe markdown rendering: react-markdown does not render raw HTML (no rehype-raw),
 * and its default urlTransform strips javascript: and other unsafe URLs.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-post">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer nofollow" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
