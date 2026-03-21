import { useEffect, useRef, useCallback, useState } from 'react'
import type { WsMessage } from '@/types'

export function useWebSocket(onMessage: (msg: WsMessage) => void, enabled = true) {
  const wsRef = useRef<WebSocket | null>(null)
  const [, setReconnectCount] = useState(0)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}/ws`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage
        onMessageRef.current(msg)
      } catch { /* ignore parse errors */ }
    }

    ws.onclose = () => {
      wsRef.current = null
      setTimeout(() => {
        setReconnectCount((c) => c + 1)
        connect()
      }, 2000)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect, enabled])

  return wsRef
}
