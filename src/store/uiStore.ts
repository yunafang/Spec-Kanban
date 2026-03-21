import { create } from 'zustand'

interface UiState {
  sidebarWidth: number
  rightPanelWidth: number
  selectedTaskId: string | null
  selectedFile: string | null
  rightTab: 'detail' | 'file' | 'issues'
  bottomMode: 'new' | 'fix' | 'refactor' | 'upload'
  setSidebarWidth: (w: number) => void
  setRightPanelWidth: (w: number) => void
  selectTask: (id: string | null) => void
  selectFile: (path: string | null) => void
  setRightTab: (tab: 'detail' | 'file' | 'issues') => void
  setBottomMode: (mode: 'new' | 'fix' | 'refactor' | 'upload') => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarWidth: 240,
  rightPanelWidth: 360,
  selectedTaskId: null,
  selectedFile: null,
  rightTab: 'detail',
  bottomMode: 'new',
  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(180, w) }),
  setRightPanelWidth: (w) => set({ rightPanelWidth: Math.max(280, w) }),
  selectTask: (id) => set({ selectedTaskId: id, rightTab: 'detail' }),
  selectFile: (path) => set({ selectedFile: path, rightTab: 'file' }),
  setRightTab: (tab) => set({ rightTab: tab }),
  setBottomMode: (mode) => set({ bottomMode: mode }),
}))
