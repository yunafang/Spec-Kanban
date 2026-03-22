import { useEffect, useRef, useCallback, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface XTerminalProps {
  /** Task ID to resume (interactive session with --resume) */
  taskId?: string | null
  /** Whether this terminal tab is active/visible */
  active: boolean
  /** Always 'interactive' — spawns a real Claude CLI session */
  mode?: 'interactive'
}

export default function XTerminal({ taskId, active, mode }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const connectedRef = useRef(false)
  const [status, setStatus] = useState<'connecting' | 'attached' | 'spawned' | 'idle' | 'error'>('idle')

  const cleanup = useCallback(() => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'pty:kill' }))
      ws.close()
    }
    wsRef.current = null
    connectedRef.current = false
    setStatus('idle')
  }, [])

  const connect = useCallback(() => {
    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setStatus('connecting')

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}/ws/pty`)
    wsRef.current = ws

    ws.onopen = () => {
      const term = termRef.current
      // Spawn an interactive Claude CLI session (with --resume if task has sessionId)
      const sessionKey = taskId ? `resume_${taskId}` : `interactive_${Date.now()}`
      ws.send(JSON.stringify({
        type: 'pty:spawn',
        sessionKey,
        taskId: taskId || undefined,
        cols: term?.cols || 120,
        rows: term?.rows || 30,
      }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'pty:output':
            termRef.current?.write(msg.data)
            break
          case 'pty:attached':
            connectedRef.current = true
            setStatus('attached')
            break
          case 'pty:spawned':
            connectedRef.current = true
            setStatus('spawned')
            break
          case 'pty:exit':
            termRef.current?.write('\r\n\x1b[90m[会话已结束]\x1b[0m\r\n')
            connectedRef.current = false
            setStatus('idle')
            break
          case 'pty:error':
            if (msg.error === 'no_active_process') {
              termRef.current?.write('\x1b[90m无法连接，请重试\x1b[0m\r\n')
              setStatus('error')
            }
            break
        }
      } catch {}
    }

    ws.onclose = () => {
      connectedRef.current = false
    }

    ws.onerror = () => {
      setStatus('error')
    }
  }, [taskId, mode])

  // Initialize xterm
  useEffect(() => {
    if (!containerRef.current || termRef.current) return

    const term = new Terminal({
      theme: {
        background: '#f6f8fa',
        foreground: '#1f2328',
        cursor: '#0969da',
        cursorAccent: '#f6f8fa',
        selectionBackground: '#0969da30',
        black: '#1f2328',
        red: '#cf222e',
        green: '#1a7f37',
        yellow: '#9a6700',
        blue: '#0969da',
        magenta: '#8250df',
        cyan: '#1b7c83',
        white: '#6e7781',
        brightBlack: '#848d97',
        brightRed: '#a40e26',
        brightGreen: '#2da44e',
        brightYellow: '#bf8700',
        brightBlue: '#218bff',
        brightMagenta: '#a475f9',
        brightCyan: '#3192aa',
        brightWhite: '#d0d7de',
      },
      fontSize: 13,
      fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 10000,
      allowProposedApi: true,
    })

    const fit = new FitAddon()
    const webLinks = new WebLinksAddon()
    term.loadAddon(fit)
    term.loadAddon(webLinks)

    term.open(containerRef.current)

    // Delay first fit to ensure container has dimensions
    requestAnimationFrame(() => fit.fit())

    termRef.current = term
    fitRef.current = fit

    // Handle user input → send to PTY (only for interactive mode)
    term.onData((data) => {
      const ws = wsRef.current
      if (ws?.readyState === WebSocket.OPEN && connectedRef.current) {
        ws.send(JSON.stringify({ type: 'pty:input', data }))
      }
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fit.fit()
        const ws = wsRef.current
        if (ws?.readyState === WebSocket.OPEN && connectedRef.current) {
          ws.send(JSON.stringify({
            type: 'pty:resize',
            cols: term.cols,
            rows: term.rows,
          }))
        }
      })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [])

  // Connect/disconnect based on active state and params
  useEffect(() => {
    if (active) {
      termRef.current?.clear()
      connect()
      setTimeout(() => fitRef.current?.fit(), 50)
    } else {
      cleanup()
      termRef.current?.clear()
    }
    return () => {
      if (active) cleanup()
    }
  }, [active, taskId, mode, connect, cleanup])

  return (
    <div className="h-full w-full relative">
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ padding: '4px 0 0 4px' }}
      />
      {status === 'attached' && (
        <div className="absolute top-1 right-2 text-[10px] text-green-600 animate-pulse">
          ● 已连接到任务进程
        </div>
      )}
    </div>
  )
}
