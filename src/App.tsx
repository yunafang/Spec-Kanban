import { useCallback, useEffect, useState } from 'react'
import Board from '@/components/Board'
import TopBar from '@/components/TopBar'
import { useTaskStore } from '@/store/taskStore'
import { useConfigStore } from '@/store/configStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { Task, WsMessage } from '@/types'

export default function App() {
  const [showNewTask, setShowNewTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const { setTasks, upsertTask, removeTask } = useTaskStore()
  const { setConfig } = useConfigStore()

  useEffect(() => {
    fetch('/api/tasks').then((r) => r.json()).then(setTasks).catch(() => {})
    fetch('/api/config').then((r) => r.json()).then(setConfig).catch(() => {})
  }, [setTasks, setConfig])

  const handleWsMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case 'task:created':
      case 'task:updated':
        upsertTask(msg.payload as Task)
        break
      case 'task:deleted':
        removeTask((msg.payload as { id: string }).id)
        break
      case 'tasks:sync':
        setTasks(msg.payload as Task[])
        break
      case 'config:updated':
        setConfig(msg.payload as any)
        break
      case 'log:stream':
        window.dispatchEvent(new CustomEvent('log:stream', { detail: msg.payload }))
        break
    }
  }, [upsertTask, removeTask, setTasks, setConfig])

  useWebSocket(handleWsMessage)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <TopBar onNewTask={() => setShowNewTask(true)} />
      <Board onTaskClick={setSelectedTask} />
      {showNewTask && (
        <NewTaskFormLazy onClose={() => setShowNewTask(false)} />
      )}
      {selectedTask && (
        <TaskDetailLazy task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  )
}

// Placeholder components — will be replaced in Task 8
function NewTaskFormLazy({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async () => {
    if (!title.trim()) return
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
          placeholder="详细描述..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer">取消</button>
          <button onClick={handleSubmit} disabled={!title.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer">提交</button>
        </div>
      </div>
    </div>
  )
}

function TaskDetailLazy({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex justify-end z-50" onClick={onClose}>
      <div className="bg-gray-900 w-full max-w-2xl h-full overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold">{task.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl cursor-pointer">×</button>
        </div>
        <p className="text-sm text-gray-400">{task.description}</p>
        <p className="text-xs text-gray-600 mt-2">Status: {task.status} · v{task.version}</p>
      </div>
    </div>
  )
}
