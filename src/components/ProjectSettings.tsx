import { useState } from 'react'
import { useConfigStore } from '@/store/configStore'

interface ProjectSettingsProps {
  onClose: () => void
}

export default function ProjectSettings({ onClose }: ProjectSettingsProps) {
  const config = useConfigStore((s) => s.config)
  const setConfig = useConfigStore((s) => s.setConfig)
  const [newPath, setNewPath] = useState('')
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState('')
  const [concurrency, setConcurrency] = useState(config.maxConcurrency)

  const handleAddProject = async () => {
    if (!newPath.trim()) return
    setValidating(true)
    setError('')
    try {
      const res = await fetch('/api/config/projects/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath })
      })
      const result = await res.json()
      if (!result.valid) {
        setError(result.error)
        setValidating(false)
        return
      }
      const addRes = await fetch('/api/config/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: result.name, path: newPath })
      })
      const newConfig = await addRes.json()
      setConfig(newConfig)
      setNewPath('')
    } catch {
      setError('请求失败')
    }
    setValidating(false)
  }

  const handleSetActive = async (name: string) => {
    const res = await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeProject: name })
    })
    setConfig(await res.json())
  }

  const handleSaveConcurrency = async () => {
    const res = await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxConcurrency: concurrency })
    })
    setConfig(await res.json())
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">项目设置</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl cursor-pointer">×</button>
        </div>

        {/* Project list */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">项目列表</h3>
          {config.projects.length === 0 ? (
            <p className="text-xs text-gray-600">暂无项目，请添加</p>
          ) : (
            <div className="space-y-2">
              {config.projects.map((p) => (
                <div key={p.name} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{p.path}</span>
                  </div>
                  {config.activeProject === p.name ? (
                    <span className="text-xs text-emerald-400">当前</span>
                  ) : (
                    <button
                      onClick={() => handleSetActive(p.name)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      切换
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add project */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">添加项目</h3>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="项目路径，如 /Users/you/projects/my-app"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
            />
            <button
              onClick={handleAddProject}
              disabled={!newPath.trim() || validating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer"
            >
              添加
            </button>
          </div>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>

        {/* Concurrency */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">并行设置</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">最大并行数:</span>
            <input
              type="number"
              min={1}
              max={10}
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="w-16 bg-gray-800 rounded-lg px-3 py-1 text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSaveConcurrency}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs cursor-pointer"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
