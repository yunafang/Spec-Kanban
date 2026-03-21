import { useEffect, useState, useMemo } from 'react'
import { marked } from 'marked'

interface FileViewerProps {
  filePath: string
  language?: string
}

interface FileInfo {
  content: string
  size: number
}

/** Extract file extension for display */
function getLanguageTag(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TypeScript (JSX)', js: 'JavaScript', jsx: 'JavaScript (JSX)',
    py: 'Python', rs: 'Rust', go: 'Go', md: 'Markdown', json: 'JSON', yaml: 'YAML',
    yml: 'YAML', toml: 'TOML', css: 'CSS', html: 'HTML', sh: 'Shell', bash: 'Shell',
    sql: 'SQL', txt: 'Text',
  }
  return langMap[ext] || ext.toUpperCase() || 'File'
}

/** Format file size for display */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Break file path into breadcrumb segments */
function pathBreadcrumbs(filePath: string): string[] {
  return filePath.split('/').filter(Boolean)
}

function MarkdownPreview({ content }: { content: string }) {
  const html = useMemo(() => {
    marked.setOptions({ breaks: true, gfm: true })
    return marked.parse(content) as string
  }, [content])

  return (
    <div
      className="prose prose-invert prose-sm max-w-none p-6
        prose-headings:text-gray-100 prose-headings:border-b prose-headings:border-gray-800 prose-headings:pb-2
        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
        prose-p:text-gray-300 prose-p:leading-relaxed
        prose-a:text-indigo-400
        prose-strong:text-gray-200
        prose-code:text-indigo-300 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
        prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800
        prose-blockquote:border-indigo-500 prose-blockquote:text-gray-400
        prose-li:text-gray-300
        prose-table:text-xs
        prose-th:text-gray-400 prose-th:border-gray-700 prose-th:px-3 prose-th:py-1.5
        prose-td:border-gray-800 prose-td:px-3 prose-td:py-1.5
        prose-hr:border-gray-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default function FileViewer({ filePath, language }: FileViewerProps) {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filePath) return

    setLoading(true)
    setError(null)
    setFileInfo(null)

    fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setFileInfo({ content: data.content, size: data.size || 0 })
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || '无法加载文件')
        setLoading(false)
      })
  }, [filePath])

  const breadcrumbs = pathBreadcrumbs(filePath)
  const langTag = language || getLanguageTag(filePath)
  const isMarkdown = filePath.endsWith('.md') || filePath.endsWith('.mdx')

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="h-4 w-48 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-gray-500 animate-pulse">加载中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-gray-800">
          <span className="text-xs text-gray-500 font-mono">{filePath}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-red-400 mb-1">加载失败</p>
            <p className="text-xs text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* File path breadcrumb + metadata */}
      <div className="px-4 py-2.5 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-1 text-xs text-gray-500 font-mono mb-1 overflow-x-auto">
          {breadcrumbs.map((seg, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <span className="text-gray-700">/</span>}
              <span className={i === breadcrumbs.length - 1 ? 'text-gray-300' : ''}>{seg}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
            {langTag}
          </span>
          {fileInfo && (
            <span className="text-[10px] text-gray-600">{formatSize(fileInfo.size)}</span>
          )}
        </div>
      </div>

      {/* File content */}
      {fileInfo ? (
        <div className="flex-1 overflow-auto">
          {isMarkdown ? (
            <MarkdownPreview content={fileInfo.content} />
          ) : (
            <pre className="text-xs font-mono text-gray-300 p-4 leading-relaxed whitespace-pre-wrap break-all">
              {fileInfo.content}
            </pre>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-gray-600">选择一个文件查看内容</span>
        </div>
      )}
    </div>
  )
}
