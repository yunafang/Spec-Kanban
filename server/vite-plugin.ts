import type { Plugin } from 'vite'
import express from 'express'
import router from './routes.js'
import { setupWebSocket } from './ws.js'

export default function specKanbanServer(): Plugin {
  return {
    name: 'spec-kanban-server',
    configureServer(server) {
      // Register BEFORE Vite's internal middleware by not returning a function
      const app = express()
      app.use(express.json())
      app.use(router)
      server.middlewares.use(app)

      // Setup WebSocket on the HTTP server
      const httpServer = server.httpServer
      if (httpServer) setupWebSocket(httpServer)
    }
  }
}
