import { useState, useEffect, useCallback } from 'react'
import type { FileNode } from '@/types'
import { useUiStore } from '@/store/uiStore'

function getFileIcon(name: string): { label: string; className: string } {
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : ''
  switch (ext) {
    case 'ts':
    case 'tsx':
      return { label: 'TS', className: 'text-blue-400 font-bold' }
    case 'js':
    case 'jsx':
      return { label: 'JS', className: 'text-yellow-400 font-bold' }
    case 'json':
      return { label: '{}', className: 'text-gray-400' }
    case 'md':
      return { label: 'MD', className: 'text-green-400 font-bold' }
    case 'css':
      return { label: '#', className: 'text-pink-400 font-bold' }
    default:
      return { label: '\u{1F4C4}', className: '' }
  }
}

function FileTreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<FileNode[] | undefined>(node.children)
  const [loading, setLoading] = useState(false)
  const selectFile = useUiStore((s) => s.selectFile)

  const isDir = node.type === 'directory'

  const handleClick = useCallback(async () => {
    if (isDir) {
      if (!expanded && (!children || children.length === 0)) {
        setLoading(true)
        try {
          const res = await fetch(`/api/files/tree?dir=${encodeURIComponent(node.path)}`)
          if (res.ok) {
            const data: FileNode[] = await res.json()
            setChildren(data)
          }
        } catch {
          // silently fail
        } finally {
          setLoading(false)
        }
      }
      setExpanded((prev) => !prev)
    } else {
      selectFile(node.path)
    }
  }, [isDir, expanded, children, node.path, selectFile])

  const icon = isDir ? null : getFileIcon(node.name)

  return (
    <div>
      <button
        onClick={handleClick}
        className="flex items-center w-full text-left hover:bg-gray-800/60 px-2 py-0.5 text-sm text-gray-300 hover:text-white transition-colors group"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDir ? (
          <span className="w-4 text-xs text-gray-500 mr-1 flex-shrink-0">
            {loading ? '...' : expanded ? '\u25BE' : '\u25B8'}
          </span>
        ) : (
          <span className={`w-4 text-[10px] mr-1 flex-shrink-0 ${icon?.className ?? ''}`}>
            {icon?.label}
          </span>
        )}
        {isDir && (
          <span className="mr-1 text-xs flex-shrink-0">
            {expanded ? '\u{1F4C2}' : '\u{1F4C1}'}
          </span>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && expanded && children && children.length > 0 && (
        <div>
          {children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileTree() {
  const [tree, setTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchTree() {
      try {
        const res = await fetch('/api/files/tree')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: FileNode[] = await res.json()
        if (!cancelled) {
          setTree(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchTree()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="px-3 py-4 text-xs text-gray-500">
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-3 py-4 text-xs text-red-400">
        Error: {error}
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-gray-500">
        No files found
      </div>
    )
  }

  return (
    <div className="py-1">
      {tree.map((node) => (
        <FileTreeNode key={node.path} node={node} depth={0} />
      ))}
    </div>
  )
}
