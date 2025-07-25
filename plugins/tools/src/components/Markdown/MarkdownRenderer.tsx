import React, { forwardRef } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import { cn } from '@pagehelper/common/src/lib/utils'
import ImagePreview, { CachedImage } from './ImagePreview'
import { Image as ImageIcon } from 'lucide-react'

export interface MarkdownRendererProps {
  markdown: string
  searchQuery: string
  cachedImages: Map<string, CachedImage>
  className?: string
}

// 高亮搜索关键词
const highlightText = (text: string, term: string): React.ReactNode[] => {
  if (!term || !text) return [text]
  const parts = text.split(new RegExp(`(${term})`, 'gi'))
  return parts.map((p, i) =>
    p.toLowerCase() === term.toLowerCase() ? (
      <span key={i} className="bg-yellow-200 rounded px-0.5">
        {p}
      </span>
    ) : (
      p
    ),
  )
}

// Markdown 自定义渲染组件
const getComponents = (
  searchQuery: string,
  cachedImages: Map<string, CachedImage>,
): Components => ({
  img: ({ node, ...props }: any) => (
    <ImagePreview src={props.src || ''} alt={props.alt} cachedImages={cachedImages} />
  ),
  p: ({ children, ...props }: any) => (
    <p {...props} className="my-1.5 leading-relaxed">
      {typeof children === 'string' ? highlightText(children, searchQuery) : children}
    </p>
  ),
  pre: ({ children, ...props }: any) => (
    <pre
      {...props}
      className="bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3 rounded-lg overflow-x-auto text-[13px] leading-relaxed border border-gray-200 dark:border-slate-700 shadow-sm my-3"
    >
      {children}
    </pre>
  ),
  code: ({ children, className, ...props }: any) => {
    const isInline = !className
    const content = typeof children === 'string' ? highlightText(children, searchQuery) : children
    return isInline ? (
      <code {...props} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[13px] font-mono">
        {content}
      </code>
    ) : (
      <code {...props} className="block text-[13px] font-mono text-slate-800 dark:text-slate-100">
        {content}
      </code>
    )
  },
  h1: ({ children, ...props }: any) => (
    <h1 {...props} className="text-xl font-bold mt-6 mb-3 pb-1 border-b border-gray-200">
      {typeof children === 'string' ? highlightText(children, searchQuery) : children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 {...props} className="text-lg font-bold mt-5 mb-2">
      {typeof children === 'string' ? highlightText(children, searchQuery) : children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 {...props} className="text-base font-semibold mt-4 mb-2">
      {typeof children === 'string' ? highlightText(children, searchQuery) : children}
    </h3>
  ),
  li: ({ children, ...props }: any) => (
    <li {...props} className="my-1">
      {typeof children === 'string' ? highlightText(children, searchQuery) : children}
    </li>
  ),
  strong: ({ children, ...props }: any) => (
    <strong {...props} className="font-semibold">
      {typeof children === 'string' ? highlightText(children, searchQuery) : children}
    </strong>
  ),
  em: ({ children, ...props }: any) => (
    <em {...props} className="italic">
      {typeof children === 'string' ? highlightText(children, searchQuery) : children}
    </em>
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote
      {...props}
      className="border-l-4 border-blue-500/50 bg-blue-50/30 pl-4 py-2 my-3 rounded-r-lg italic"
    >
      {typeof children === 'string' ? highlightText(children, searchQuery) : children}
    </blockquote>
  ),
})

export const MarkdownRenderer = forwardRef<HTMLDivElement, MarkdownRendererProps>(
  ({ markdown, searchQuery, cachedImages, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('prose prose-sm dark:prose-invert max-w-none p-4 h-full overflow-auto', className)}
      >
        <ReactMarkdown components={getComponents(searchQuery, cachedImages)}>
          {markdown}
        </ReactMarkdown>
      </div>
    )
  },
) 