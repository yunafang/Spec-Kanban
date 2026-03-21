import { useState, useRef, useEffect } from 'react'
import { useConfigStore } from '@/store/configStore'

function FolderBrowser({ onSelect, onCancel }: { onSelect: (path: string) => void; onCancel: () => void }) {
  const [currentPath, setCurrentPath] = useState('')
  const [dirs, setDirs] = useState<string[]>([])
  const [isGit, setIsGit] = useState(false)
  const [loading, setLoading] = useState(true)

  const browse = (dir?: string) => {
    setLoading(true)
    const url = dir ? `/api/browse?dir=${encodeURIComponent(dir)}` : '/api/browse'
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setCurrentPath(data.path)
        setDirs(data.dirs)
        setIsGit(data.isGit)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { browse() }, [])

  const goUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/'
    browse(parent)
  }

  return (
    <div className="p-2">
      {/* Current path */}
      <div className="flex items-center gap-1 mb-2">
        <button onClick={goUp} className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer px-1">⬆</button>
        <div className="text-[10px] text-gray-400 font-mono truncate flex-1">{currentPath}</div>
      </div>

      {/* Git indicator + select button */}
      {isGit && (
        <button
          onClick={() => onSelect(currentPath)}
          className="w-full mb-2 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-medium cursor-pointer text-center"
        >
          ✓ 选择此项目 (Git 仓库)
        </button>
      )}

      {/* Directory list */}
      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {loading ? (
          <div className="text-xs text-gray-600 py-2 text-center animate-pulse">加载中...</div>
        ) : dirs.length === 0 ? (
          <div className="text-xs text-gray-600 py-2 text-center">无子目录</div>
        ) : (
          dirs.map(dir => (
            <button
              key={dir}
              onClick={() => browse(currentPath + '/' + dir)}
              className="w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-gray-800 rounded cursor-pointer flex items-center gap-1.5 truncate"
            >
              <span className="text-gray-500">📁</span>
              {dir}
            </button>
          ))
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-800 flex gap-1.5">
        <button onClick={onCancel} className="px-2 py-1 text-[10px] text-gray-400 hover:text-gray-200 cursor-pointer">取消</button>
        {!isGit && (
          <span className="text-[10px] text-gray-600 ml-auto py-1">需要是 Git 仓库</span>
        )}
      </div>
    </div>
  )
}

export default function ProjectSwitcher() {
  const { config, setConfig } = useConfigStore()
  const [open, setOpen] = useState(false)
  const [browsing, setBrowsing] = useState(false)
  const [manualPath, setManualPath] = useState(false)
  const [newPath, setNewPath] = useState('')
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setBrowsing(false)
        setManualPath(false)
      }
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
    window.location.reload()
  }

  const addProject = async (projectPath: string) => {
    const res = await fetch('/api/config/projects/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectPath })
    })
    const result = await res.json()
    if (!result.valid) { setError(result.error); return }

    const addRes = await fetch('/api/config/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: result.name, path: projectPath })
    })
    setConfig(await addRes.json())
    setBrowsing(false)
    setManualPath(false)
    setOpen(false)
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
        <div className="absolute top-full left-0 mt-1 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {browsing ? (
            <FolderBrowser
              onSelect={addProject}
              onCancel={() => setBrowsing(false)}
            />
          ) : (
            <>
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
                <div className="px-3 py-3 text-xs text-gray-600 text-center">暂无项目，添加一个开始</div>
              )}

              {/* Add project options */}
              <div className="border-t border-gray-800">
                {manualPath ? (
                  <div className="p-2">
                    <input
                      className="w-full bg-gray-800 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 mb-1.5"
                      placeholder="输入项目路径"
                      value={newPath}
                      onChange={(e) => setNewPath(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addProject(newPath)}
                      autoFocus
                    />
                    {error && <div className="text-[10px] text-red-400 mb-1">{error}</div>}
                    <div className="flex gap-1.5">
                      <button onClick={() => addProject(newPath)} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-[10px] cursor-pointer">添加</button>
                      <button onClick={() => { setManualPath(false); setError('') }} className="px-2 py-1 text-gray-400 text-[10px] cursor-pointer">取消</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex">
                    <button
                      onClick={() => setBrowsing(true)}
                      className="flex-1 text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200 cursor-pointer"
                    >
                      📂 浏览文件夹
                    </button>
                    <button
                      onClick={() => setManualPath(true)}
                      className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-800 hover:text-gray-300 cursor-pointer border-l border-gray-800"
                    >
                      ⌨️ 输入路径
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
