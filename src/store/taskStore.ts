import { create } from 'zustand'
import type { Task } from '@/types'

interface TaskState {
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  upsertTask: (task: Task) => void
  removeTask: (id: string) => void
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  upsertTask: (task) =>
    set((state) => {
      const idx = state.tasks.findIndex((t) => t.id === task.id)
      if (idx === -1) return { tasks: [...state.tasks, task] }
      const updated = [...state.tasks]
      updated[idx] = task
      return { tasks: updated }
    }),
  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }))
}))
