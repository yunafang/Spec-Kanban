import { useCallback, useEffect, useState } from 'react'
import Board from '@/components/Board'
import TopBar from '@/components/TopBar'
import NewTaskForm from '@/components/NewTaskForm'
import TaskDetail from '@/components/TaskDetail'
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
      {showNewTask && <NewTaskForm onClose={() => setShowNewTask(false)} />}
      {selectedTask && (
        <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  )
}
