import { useState, useEffect } from 'react'
import { builtinSkills } from '@/skills'
import type { Skill } from '@/types'

export default function SkillBar() {
  const [enabled, setEnabled] = useState<string[]>([])
  const [customSkills, setCustomSkills] = useState<Skill[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [gitUrl, setGitUrl] = useState('')
  const [importing, setImporting] = useState(false)

  const loadSkills = () => {
    fetch('/api/project/skills')
      .then(r => r.json())
      .then(data => {
        setEnabled(data.enabled || [])
        setCustomSkills(data.custom || [])
      })
      .catch(() => {})
  }

  useEffect(() => { loadSkills() }, [])

  // All available skills = builtin + custom
  const allSkills = [...builtinSkills, ...customSkills]
  const enabledSkills = allSkills.filter(s => enabled.includes(s.id))
  const availableSkills = builtinSkills.filter(s => !enabled.includes(s.id))

  const handleEnable = async (id: string) => {
    await fetch('/api/project/skills/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId: id })
    })
    loadSkills()
  }

  const handleDisable = async (id: string) => {
    if (enabled.length <= 1) return // keep at least one
    await fetch('/api/project/skills/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId: id })
    })
    loadSkills()
  }

  const handleImport = async () => {
    if (!gitUrl.trim()) return
    setImporting(true)
    try {
      const res = await fetch('/api/project/skills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gitUrl })
      })
      const data = await res.json()
      if (data.ok) { setGitUrl(''); setShowAdd(false); loadSkills() }
    } catch {}
    setImporting(false)
  }

  return (
    <div className="px-2 pb-2">
      {/* Enabled skills */}
      <div className="mb-2">
        <div className="text-[10px] text-gray-500 mb-1 px-1">已启用</div>
        <div className="flex flex-wrap gap-1">
          {enabledSkills.map(s => (
            <span key={s.id} className="group flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] border border-blue-200">
              {s.icon} {s.name}
              {enabled.length > 1 && (
                <button onClick={() => handleDisable(s.id)}
                  className="hidden group-hover:inline text-gray-500 hover:text-red-600 cursor-pointer ml-0.5">×</button>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Add skill */}
      {showAdd ? (
        <div className="space-y-1.5">
          {/* Built-in options */}
          {availableSkills.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-500 mb-1 px-1">内置</div>
              <div className="flex flex-wrap gap-1">
                {availableSkills.map(s => (
                  <button key={s.id} onClick={() => handleEnable(s.id)}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 hover:text-gray-800 rounded text-[10px] border border-gray-300 cursor-pointer hover:border-gray-400">
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Git import */}
          <div>
            <div className="text-[10px] text-gray-500 mb-1 px-1">从 Git 导入</div>
            <div className="flex gap-1">
              <input value={gitUrl} onChange={e => setGitUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="flex-1 bg-white rounded px-1.5 py-1 text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={e => e.key === 'Enter' && handleImport()} />
              <button onClick={handleImport} disabled={importing}
                className="px-1.5 py-1 bg-blue-600 rounded text-[10px] cursor-pointer disabled:opacity-50">
                {importing ? '...' : '导入'}
              </button>
            </div>
          </div>
          <button onClick={() => setShowAdd(false)}
            className="text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer px-1">取消</button>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="text-[10px] text-gray-500 hover:text-gray-700 cursor-pointer px-1">
          + 添加 Skill
        </button>
      )}
    </div>
  )
}
