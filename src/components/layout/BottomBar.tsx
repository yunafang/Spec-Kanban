import { useState, useRef } from 'react'
import { useUiStore } from '@/store/uiStore'

const modes = [
  { key: 'new', label: '📝 新需求', skillId: 'superpowers' },
  { key: 'fix', label: '🔧 修 Bug', skillId: 'quick-fix' },
  { key: 'refactor', label: '♻️ 改方案', skillId: 'refactor' },
  { key: 'upload', label: '📎 上传', skillId: 'superpowers' },
] as const

export default function BottomBar() {
  const { bottomMode, setBottomMode } = useUiStore()
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const currentMode = modes.find((m) => m.key === bottomMode)!

  const handleSubmit = async () => {
    if (!input.trim() || submitting) return
    setSubmitting(true)
    try {
      const title = input.split('\n')[0].slice(0, 30).trim() || input.slice(0, 30)
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: input,
          skillId: currentMode.skillId,
        }),
      })
      setInput('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInputClick = () => {
    if (bottomMode === 'upload') {
      fileRef.current?.click()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload/parse', { method: 'POST', body: formData })
      const data = await res.json()
      setInput(data.content || '')
    } catch {
      // silently ignore upload errors
    }
    // Reset the file input so the same file can be re-selected
    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  return (
    <footer className="h-14 border-t border-gray-800 bg-gray-900/80 shrink-0 flex items-center gap-2 px-3">
      {/* Mode selector */}
      <div className="flex rounded-lg overflow-hidden border border-gray-700 shrink-0">
        {modes.map((mode) => (
          <button
            key={mode.key}
            onClick={() => setBottomMode(mode.key)}
            className={`px-2.5 py-1 text-xs whitespace-nowrap transition-colors ${
              bottomMode === mode.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Text input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onClick={handleInputClick}
        placeholder={bottomMode === 'upload' ? '点击此处上传文件...' : '描述你的需求...'}
        readOnly={bottomMode === 'upload'}
        className="flex-1 h-9 px-3 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
      />

      {/* Hidden file input for upload mode */}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Send button */}
      <button
        onClick={handleSubmit}
        disabled={!input.trim() || submitting}
        className="h-9 px-4 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      >
        {submitting ? '...' : '发送'}
      </button>
    </footer>
  )
}
