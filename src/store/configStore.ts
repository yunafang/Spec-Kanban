import { create } from 'zustand'
import type { AppConfig } from '@/types'

interface ConfigState {
  config: AppConfig
  setConfig: (config: AppConfig) => void
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: {
    projects: [],
    activeProject: null,
    maxConcurrency: 3,
    timeoutMinutes: 10
  },
  setConfig: (config) => set({ config })
}))
