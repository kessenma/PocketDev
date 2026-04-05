import { create } from 'zustand'
import type { PrerequisitesReport } from '@pocketdev/shared/types'
import { fetchPrerequisites } from '../services/api'
import { useConnectionStore } from './connection'
import { useNewTaskDraftStore } from './new-task-draft'

interface SetupState {
  report: PrerequisitesReport | null
  loading: boolean
  error: string | null
  fetchPrerequisites: () => Promise<void>
}

export const useSetupStore = create<SetupState>((set) => ({
  report: null,
  loading: false,
  error: null,

  fetchPrerequisites: async () => {
    const server = useConnectionStore.getState().server
    if (!server) {
      set({ error: 'Not connected to a server' })
      return
    }

    set({ loading: true, error: null })

    try {
      const report = (await fetchPrerequisites(server.ip, server.port)) as PrerequisitesReport
      set({ report, loading: false })
      useNewTaskDraftStore.getState().loadCapabilities()
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to check prerequisites',
        loading: false,
      })
    }
  },
}))
