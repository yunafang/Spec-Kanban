import { useState, useRef, useEffect } from 'react'
import { useConfigStore } from '@/store/configStore'

export default function ProjectSwitcher() {
  const { config, setConfig } = useConfigStore()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newPath, setNewPath] = useState('')
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSwitch = async (name: string) => {
    await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeProject: name })
    }).then(r => r.json()).then(setConfig)
    setOpen(false)
    window.location.reload() // Reload to refresh file tree
  }

  const handleAdd = async () => {
    if (!newPath.trim()) return
    setError('')
    const res = await fetch('/api/config/projects/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath })
    })
    const result = await res.json()
    if (!result.valid) { setError(result.error); return }

    const addRes = await fetch('/api/config/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: result.name, path: newPath })
    })
    setConfig(await addRes.json())
    setNewPath('')
    setAdding(false)
    window.location.reload()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs px-2.5 py-1 rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/50 cursor-pointer transition-colors flex items-center gap-1.5"
      >
        📂 {config.activeProject || '选择项目'}
        <span className="text-indigo-400 text-[10px]">▼</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Project list */}
          {config.projects.map((p) => (
            <button
              key={p.name}
              onClick={() => handleSwitch(p.name)}
              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                config.activeProject === p.name
                  ? 'bg-indigo-600/20 text-indigo-300'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span>{config.activeProject === p.name ? '✓' : ' '}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{p.name}</div>
                <div className="text-[10px] text-gray-500 truncate">{p.path}</div>
              </div>
            </button>
          ))}

          {config.projects.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-600">暂无项目</div>
          )}

          {/* Add project */}
          <div className="border-t border-gray-800">
            {adding ? (
              <div className="p-2">
                <input
                  className="w-full bg-gray-800 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 mb-1.5"
                  placeholder="项目路径，如 /Users/you/my-app"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  autoFocus
                />
                {error && <div className="text-[10px] text-red-400 mb-1">{error}</div>}
                <div className="flex gap-1.5">
                  <button onClick={handleAdd} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-[10px] cursor-pointer">添加</button>
                  <button onClick={() => { setAdding(false); setError('') }} className="px-2 py-1 text-gray-400 hover:text-gray-200 text-[10px] cursor-pointer">取消</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200 cursor-pointer"
              >
                + 添加项目
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
