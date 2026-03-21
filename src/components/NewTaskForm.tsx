import { useState } from 'react'

interface NewTaskFormProps {
  onClose: () => void
}

export default function NewTaskForm({ onClose }: NewTaskFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">新需求</h2>
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
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer"
          >
            提交
          </button>
        </div>
      </div>
    </div>
  )
}
