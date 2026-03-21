import { useState } from 'react'

interface NewTaskFormProps {
  onClose: () => void
}

type Mode = 'single' | 'batch'

export default function NewTaskForm({ onClose }: NewTaskFormProps) {
  const [mode, setMode] = useState<Mode>('single')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [batchText, setBatchText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(0)

  const handleSubmitSingle = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    })
    onClose()
  }

  const handleSubmitBatch = async () => {
    const lines = batchText
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter((l) => l.length > 0)
    if (lines.length === 0) return

    setSubmitting(true)
    setSubmitted(0)

    for (const line of lines) {
      // Support "title | description" or "title: description" format
      let taskTitle = line
      let taskDesc = ''
      const separators = [' | ', '：', ': ']
      for (const sep of separators) {
        const idx = line.indexOf(sep)
        if (idx > 0) {
          taskTitle = line.slice(0, idx).trim()
          taskDesc = line.slice(idx + sep.length).trim()
          break
        }
      }
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: taskTitle, description: taskDesc })
      })
      setSubmitted((n) => n + 1)
    }
    onClose()
  }

  const batchCount = batchText
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((l) => l.length > 0).length

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        {/* Mode toggle */}
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold flex-1">新需求</h2>
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setMode('single')}
              className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                mode === 'single' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              单个
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                mode === 'batch' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              批量
            </button>
          </div>
        </div>

        {mode === 'single' ? (
          <>
            <input
              className="w-full bg-gray-800 rounded-lg px-4 py-2 mb-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="需求标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <textarea
              className="w-full bg-gray-800 rounded-lg px-4 py-2 mb-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
              placeholder="详细描述你的需求..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </>
        ) : (
          <>
            <textarea
              className="w-full bg-gray-800 rounded-lg px-4 py-2 mb-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-48 resize-none font-mono"
              placeholder={`每行一个需求，支持以下格式：\n\n用户登录功能\n数据导出 | 支持 CSV 和 Excel 格式\n权限系统：基于角色的访问控制\n\n也支持列表符号：\n- 需求一\n1. 需求二`}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">
                {batchCount > 0 ? `识别到 ${batchCount} 个需求` : '请输入需求'}
              </span>
              {submitting && (
                <span className="text-xs text-indigo-400">
                  提交中 {submitted}/{batchCount}...
                </span>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">
            取消
          </button>
          <button
            onClick={mode === 'single' ? handleSubmitSingle : handleSubmitBatch}
            disabled={mode === 'single' ? !title.trim() || submitting : batchCount === 0 || submitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer"
          >
            {mode === 'single' ? '提交' : `提交 ${batchCount} 个需求`}
          </button>
        </div>
      </div>
    </div>
  )
}
