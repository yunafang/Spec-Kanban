import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import { useTaskStore } from '@/store/taskStore'
import { useConfigStore } from '@/store/configStore'
import { useUiStore } from '@/store/uiStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import ResizeHandle from '@/components/layout/ResizeHandle'
import Sidebar from '@/components/layout/Sidebar'
import StageKanban from '@/components/layout/StageKanban'
import TerminalPanel from '@/components/layout/TerminalPanel'
import RightPanel from '@/components/layout/RightPanel'
import BottomBar from '@/components/layout/BottomBar'
import ProjectSwitcher from '@/components/layout/ProjectSwitcher'
import HumanTodoPanel from '@/components/layout/HumanTodoPanel'
import FileViewer from '@/components/files/FileViewer'
import type { Task, WsMessage } from '@/types'

function ArtifactPreviewContent({ content }: { content: string }) {
  const html = useMemo(() => {
    marked.setOptions({ breaks: true, gfm: true })
    return marked.parse(content) as string
  }, [content])

  return (
    <div
      className="prose prose-sm max-w-none p-6
        prose-headings:text-gray-900 prose-headings:border-b prose-headings:border-gray-200 prose-headings:pb-2
        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
        prose-p:text-gray-700 prose-p:leading-relaxed
        prose-a:text-blue-600 prose-strong:text-gray-900
        prose-code:text-blue-700 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
        prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200
        prose-blockquote:border-blue-400 prose-blockquote:text-gray-500
        prose-li:text-gray-700
        prose-table:text-xs prose-th:text-gray-500 prose-th:border-gray-300 prose-th:px-3 prose-th:py-1.5
        prose-td:border-gray-200 prose-td:px-3 prose-td:py-1.5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

const humanLabels: Record<string, string> = {
  confirm_design: '审批设计',
  confirm_plan: '审批计划',
  confirm_split: '确认拆分',
  confirm_merge: '确认合并',
  error: '出错',
}

const isDemo = import.meta.env.VITE_DEMO === 'true'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const { setTasks, upsertTask, removeTask } = useTaskStore()
  const { config, setConfig } = useConfigStore()
  const { sidebarWidth, rightPanelWidth, terminalHeight, selectedFile, previewArtifact, setSidebarWidth, setRightPanelWidth, setTerminalHeight, selectFile, setPreviewArtifact } = useUiStore()
  const selectTask = useUiStore((s) => s.selectTask)
  const prevTaskStatesRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (isDemo) {
      import('@/mock/data').then(({ mockTasks, mockConfig }) => {
        setTasks(mockTasks)
        setConfig(mockConfig)
      })
    } else {
      fetch('/api/tasks').then((r) => r.json()).then((tasks: Task[]) => {
        setTasks(tasks)
        // Initialize known task states
        for (const t of tasks) {
          prevTaskStatesRef.current.set(t.id, t.status)
        }
      }).catch(() => {})
      fetch('/api/config').then((r) => r.json()).then(setConfig).catch(() => {})
    }
  }, [setTasks, setConfig])

  // On load: check if we should auto-select a task (after project switch)
  useEffect(() => {
    const pendingId = sessionStorage.getItem('spec-kanban:pendingSelectTask')
    if (pendingId) {
      sessionStorage.removeItem('spec-kanban:pendingSelectTask')
      // Wait for tasks to load, then select
      const trySelect = () => {
        const tasks = useTaskStore.getState().tasks
        if (tasks.length > 0) {
          const found = tasks.find((t) => t.id === pendingId)
          if (found) selectTask(found.id)
        } else {
          setTimeout(trySelect, 200)
        }
      }
      setTimeout(trySelect, 300)
    }
  }, [selectTask])

  // Request notification permission early
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Send browser notification when a task transitions to needs_human
  const sendBrowserNotification = useCallback((task: Task) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const actionLabel = task.humanAction ? (humanLabels[task.humanAction] || task.humanAction) : '需要确认'
    const notification = new Notification(`🖐️ ${task.projectName || '项目'} - ${actionLabel}`, {
      body: task.title,
      tag: `task-${task.id}`,
      icon: '/favicon.ico',
    })
    notification.onclick = () => {
      window.focus()
      selectTask(task.id)
      notification.close()
    }
  }, [selectTask])

  const handleWsMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case 'task:created':
      case 'task:updated': {
        const task = msg.payload as Task
        // Check if task just transitioned to needs_human
        const prevStatus = prevTaskStatesRef.current.get(task.id)
        if (task.status === 'needs_human' && prevStatus && prevStatus !== 'needs_human') {
          sendBrowserNotification(task)
        }
        prevTaskStatesRef.current.set(task.id, task.status)
        upsertTask(task)
        break
      }
      case 'task:deleted':
        removeTask((msg.payload as { id: string }).id)
        prevTaskStatesRef.current.delete((msg.payload as { id: string }).id)
        break
      case 'tasks:sync': {
        const tasks = msg.payload as Task[]
        setTasks(tasks)
        for (const t of tasks) {
          prevTaskStatesRef.current.set(t.id, t.status)
        }
        break
      }
      case 'config:updated':
        setConfig(msg.payload as any)
        break
      case 'log:stream':
        window.dispatchEvent(new CustomEvent('log:stream', { detail: msg.payload }))
        break
    }
  }, [upsertTask, removeTask, setTasks, setConfig, sendBrowserNotification])

  useWebSocket(handleWsMessage, !isDemo)

  const runningCount = useTaskStore((s) => s.tasks.filter((t) => t.status === 'executing').length)

  return (
    <div className="h-screen flex flex-col bg-white text-gray-800">
      {/* Header bar */}
      <header className="flex items-center justify-between px-4 h-11 border-b border-[#1b1f23] bg-[#24292f] shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-wide text-white">Spec Kanban</h1>
          <ProjectSwitcher />
        </div>
        <div className="flex items-center gap-3">
          <HumanTodoPanel />
          <span className="text-xs text-gray-300">
            并行: {runningCount}/{config.maxConcurrency}
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs px-2.5 py-1 rounded bg-[#32383f] hover:bg-[#3d444d] text-gray-300 hover:text-white transition-colors border border-[#3d444d]"
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
          className="shrink-0 border-r border-gray-200 bg-[#f6f8fa] overflow-hidden"
        >
          <Sidebar />
        </aside>

        <ResizeHandle onResize={(delta) => setSidebarWidth(useUiStore.getState().sidebarWidth + delta)} />

        {/* Center panel */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {selectedFile ? (
            <>
              <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-200 bg-[#f6f8fa] shrink-0">
                <span className="text-xs text-gray-500 flex-1 truncate font-mono">
                  {selectedFile.split('/').map((seg, i, arr) => (
                    <span key={i}>
                      {i > 0 && <span className="text-gray-400 mx-0.5">/</span>}
                      <span className={i === arr.length - 1 ? 'text-gray-800' : ''}>{seg}</span>
                    </span>
                  ))}
                </span>
                <button
                  onClick={() => selectFile(null)}
                  className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer px-2 py-0.5 rounded hover:bg-gray-100"
                >
                  ✕ 关闭
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <FileViewer filePath={selectedFile} />
              </div>
            </>
          ) : previewArtifact ? (
            <>
              <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-200 bg-amber-50 shrink-0">
                <span className="text-xs text-amber-700 font-medium flex-1 truncate">
                  {previewArtifact.stage === 'design' ? '💡 设计方案' : '📝 实施计划'} — {previewArtifact.title}
                </span>
                <button
                  onClick={() => {
                    selectTask(previewArtifact.taskId)
                    useUiStore.getState().setRightTab('issues')
                  }}
                  className="text-xs px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer"
                >
                  💬 提 Issue
                </button>
                <button
                  onClick={() => setPreviewArtifact(null)}
                  className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer px-2 py-0.5 rounded hover:bg-gray-100"
                >
                  ✕ 关闭
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <ArtifactPreviewContent content={previewArtifact.content} />
              </div>
            </>
          ) : (
            <>
              {/* Stage kanban */}
              <div className="flex-1 overflow-hidden">
                <StageKanban />
              </div>
              {/* Horizontal resize handle */}
              <ResizeHandle direction="vertical" onResize={(delta) => setTerminalHeight(useUiStore.getState().terminalHeight - delta)} />
              {/* Terminal panel */}
              <div style={{ height: terminalHeight }} className="shrink-0 border-t border-gray-200 overflow-hidden">
                <TerminalPanel />
              </div>
            </>
          )}
        </main>

        <ResizeHandle onResize={(delta) => setRightPanelWidth(useUiStore.getState().rightPanelWidth - delta)} />

        {/* Right panel */}
        <aside
          style={{ width: rightPanelWidth }}
          className="shrink-0 border-l border-gray-200 bg-[#f6f8fa] overflow-hidden"
        >
          <RightPanel />
        </aside>
      </div>

      {/* Bottom bar */}
      <BottomBar />
    </div>
  )
}
