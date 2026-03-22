import { useState } from 'react'

interface IssueFormProps {
  taskId: string
  defaultStage?: string
  onSubmit: () => void
}

export default function IssueForm({ taskId, defaultStage, onSubmit }: IssueFormProps) {
  const [content, setContent] = useState('')
  const [stage, setStage] = useState(defaultStage || 'brainstorm')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return
    setSubmitting(true)
    await fetch(`/api/tasks/${taskId}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, content })
    })
    setContent('')
    setSubmitting(false)
    onSubmit()
  }

  return (
    <div className="p-3 border-t border-gray-200">
      <div className="text-xs text-gray-500 font-semibold mb-2">新建 Issue</div>
      <select value={stage} onChange={e => setStage(e.target.value)}
        className="w-full bg-gray-100 rounded px-2 py-1 text-xs mb-2 outline-none">
        <option value="brainstorm">💡 Brainstorm</option>
        <option value="planning">📝 Planning</option>
        <option value="executing">🚀 Executing</option>
      </select>
      <textarea value={content} onChange={e => setContent(e.target.value)}
        placeholder="描述问题..."
        className="w-full bg-gray-100 rounded px-2 py-1.5 text-sm h-20 resize-none outline-none focus:ring-1 focus:ring-blue-500 mb-2"
      />
      <button onClick={handleSubmit} disabled={!content.trim() || submitting}
        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium disabled:opacity-50 cursor-pointer">
        提交 Issue
      </button>
    </div>
  )
}
