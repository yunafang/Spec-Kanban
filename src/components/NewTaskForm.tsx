import { useState, useRef } from 'react'
import { builtinSkills } from '@/skills'

interface NewTaskFormProps {
  onClose: () => void
}

type Mode = 'single' | 'batch' | 'upload'

export default function NewTaskForm({ onClose }: NewTaskFormProps) {
  const [mode, setMode] = useState<Mode>('single')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [skillId, setSkillId] = useState('superpowers')
  const [batchText, setBatchText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(0)
  const [uploadedContent, setUploadedContent] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSubmitSingle = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, skillId })
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
        body: JSON.stringify({ title: taskTitle, description: taskDesc, skillId })
      })
      setSubmitted((n) => n + 1)
    }
    onClose()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload/parse', { method: 'POST', body: formData })
      const data = await res.json()
      setUploadedContent(data.content || '')
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    } catch {
      setUploadedContent('文件解析失败')
    }
  }

  const handleSubmitUpload = async () => {
    if (!uploadedContent.trim()) return
    setSubmitting(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title || fileName,
        description: uploadedContent,
        skillId
      })
    })
    onClose()
  }

  const batchCount = batchText
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((l) => l.length > 0).length

  const selectedSkill = builtinSkills.find((s) => s.id === skillId)!

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-bold flex-1">新需求</h2>
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            {(['single', 'batch', 'upload'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  mode === m ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {m === 'single' ? '单个' : m === 'batch' ? '批量' : '上传'}
              </button>
            ))}
          </div>
        </div>

        {/* Skill selector */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-2 block">选择 Skill 模板</label>
          <div className="grid grid-cols-3 gap-2">
            {builtinSkills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => setSkillId(skill.id)}
                className={`p-2.5 rounded-lg text-left cursor-pointer transition-all border ${
                  skillId === skill.id
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{skill.icon}</span>
                  <span className="text-xs font-medium">{skill.name}</span>
                </div>
                <div className="text-[10px] text-gray-500 line-clamp-2">{skill.description}</div>
              </button>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-gray-600">
            流程：{selectedSkill.stages.map((s) => `${s.icon} ${s.label}`).join(' → ')} → ✅ 完成
          </div>
        </div>

        {/* Content area by mode */}
        {mode === 'single' && (
          <>
            <input
              className="w-full bg-gray-800 rounded-lg px-4 py-2 mb-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="需求标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <textarea
              className="w-full bg-gray-800 rounded-lg px-4 py-2 mb-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-28 resize-none"
              placeholder="详细描述你的需求..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </>
        )}

        {mode === 'batch' && (
          <>
            <textarea
              className="w-full bg-gray-800 rounded-lg px-4 py-2 mb-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-40 resize-none font-mono"
              placeholder={`每行一个需求，支持以下格式：\n\n用户登录功能\n数据导出 | 支持 CSV 和 Excel 格式\n权限系统：基于角色的访问控制`}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">
                {batchCount > 0 ? `识别到 ${batchCount} 个需求` : '请输入需求'}
              </span>
              {submitting && (
                <span className="text-xs text-indigo-400">提交中 {submitted}/{batchCount}...</span>
              )}
            </div>
          </>
        )}

        {mode === 'upload' && (
          <>
            <input
              className="w-full bg-gray-800 rounded-lg px-4 py-2 mb-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="需求标题（可选，默认用文件名）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-700 rounded-lg p-6 mb-3 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-colors"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".md,.txt,.pdf,.doc,.docx,.json,.csv,.prd"
                onChange={handleFileChange}
                className="hidden"
              />
              {fileName ? (
                <div>
                  <div className="text-sm font-medium text-indigo-400 mb-1">📎 {fileName}</div>
                  <div className="text-xs text-gray-500">点击重新选择</div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl mb-2">📄</div>
                  <div className="text-sm text-gray-400 mb-1">点击选择文件</div>
                  <div className="text-xs text-gray-600">支持 .md .txt .pdf .doc .docx .json .csv .prd</div>
                </div>
              )}
            </div>
            {/* Preview */}
            {uploadedContent && (
              <div className="mb-3">
                <div className="text-xs text-gray-400 mb-1">文件内容预览</div>
                <div className="bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto text-xs text-gray-300 whitespace-pre-wrap">
                  {uploadedContent.slice(0, 2000)}
                  {uploadedContent.length > 2000 && <span className="text-gray-600">... (已截断)</span>}
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">
            取消
          </button>
          <button
            onClick={
              mode === 'single' ? handleSubmitSingle :
              mode === 'batch' ? handleSubmitBatch :
              handleSubmitUpload
            }
            disabled={
              mode === 'single' ? !title.trim() || submitting :
              mode === 'batch' ? batchCount === 0 || submitting :
              !uploadedContent.trim() || submitting
            }
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer"
          >
            {mode === 'single' ? '提交' :
             mode === 'batch' ? `提交 ${batchCount} 个需求` :
             '提交'}
          </button>
        </div>
      </div>
    </div>
  )
}
