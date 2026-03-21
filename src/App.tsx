import { useCallback, useEffect, useState } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useConfigStore } from '@/store/configStore'
import { useUiStore } from '@/store/uiStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import ResizeHandle from '@/components/layout/ResizeHandle'
import Sidebar from '@/components/layout/Sidebar'
import TaskTable from '@/components/layout/TaskTable'
import RightPanel from '@/components/layout/RightPanel'
import BottomBar from '@/components/layout/BottomBar'
import type { Task, WsMessage } from '@/types'

const isDemo = import.meta.env.VITE_DEMO === 'true'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const { setTasks, upsertTask, removeTask } = useTaskStore()
  const { config, setConfig } = useConfigStore()
  const { sidebarWidth, rightPanelWidth, setSidebarWidth, setRightPanelWidth } = useUiStore()

  useEffect(() => {
    if (isDemo) {
      import('@/mock/data').then(({ mockTasks, mockConfig }) => {
        setTasks(mockTasks)
        setConfig(mockConfig)
      })
    } else {
      fetch('/api/tasks').then((r) => r.json()).then(setTasks).catch(() => {})
      fetch('/api/config').then((r) => r.json()).then(setConfig).catch(() => {})
    }
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

  useWebSocket(handleWsMessage, !isDemo)

  const runningCount = useTaskStore((s) => s.tasks.filter((t) => t.status === 'executing').length)

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* Header bar */}
      <header className="flex items-center justify-between px-4 h-11 border-b border-gray-800 bg-gray-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-wide text-gray-100">Spec Kanban</h1>
          {config.activeProject && (
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
              {config.activeProject}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            并行: {runningCount}/{config.maxConcurrency}
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-gray-100 transition-colors border border-gray-700"
          >
            Settings
          </button>
        </div>
      </header>

      {/* Main area: 3 columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <aside
          style={{ width: sidebarWidth }}
          className="shrink-0 border-r border-gray-800 bg-gray-900/50 overflow-hidden"
        >
          <Sidebar />
        </aside>

        <ResizeHandle onResize={(delta) => setSidebarWidth(sidebarWidth + delta)} />

        {/* Center panel */}
        <main className="flex-1 overflow-hidden">
          <TaskTable />
        </main>

        <ResizeHandle onResize={(delta) => setRightPanelWidth(rightPanelWidth - delta)} />

        {/* Right panel */}
        <aside
          style={{ width: rightPanelWidth }}
          className="shrink-0 border-l border-gray-800 bg-gray-900/50 overflow-hidden"
        >
          <RightPanel />
        </aside>
      </div>

      {/* Bottom bar */}
      <BottomBar />
    </div>
  )
}
