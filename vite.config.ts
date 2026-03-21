import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import specKanbanServer from './server/vite-plugin.js'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    specKanbanServer()
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  server: {
    port: 5173,
    watch: {
      ignored: ['**/data/**']
    }
  }
})
