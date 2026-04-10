import { create } from 'zustand'
import type {
  EnvVar,
  CreateEnvVarRequest,
  UpdateEnvVarRequest,
  BulkEnvVarItem,
} from '@pocketdev/shared/types'
import {
  fetchEnvVars,
  postCreateEnvVar,
  patchEnvVar,
  deleteEnvVarById,
  patchBulkEnvVars,
} from '../services/api'
import { useConnectionStore } from './connection'

type EnvState = {
  envVars: EnvVar[]
  isLoading: boolean
  error: string | null

  fetch: (projectPath: string) => Promise<void>
  create: (input: CreateEnvVarRequest) => Promise<void>
  update: (id: string, patch: UpdateEnvVarRequest) => Promise<void>
  remove: (id: string) => Promise<void>
  bulkUpsert: (projectPath: string, data: BulkEnvVarItem[]) => Promise<void>
  resetForProjectChange: () => void
}

function getServer() {
  return useConnectionStore.getState().server
}

export const useEnvStore = create<EnvState>((set, get) => ({
  envVars: [],
  isLoading: false,
  error: null,

  fetch: async (projectPath) => {
    const server = getServer()
    if (!server) return
    set({ isLoading: true, error: null })
    try {
      const { envVars } = await fetchEnvVars(server.ip, server.port, projectPath)
      set({ envVars, isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load env vars' })
    }
  },

  create: async (input) => {
    const server = getServer()
    if (!server) return
    await postCreateEnvVar(server.ip, server.port, input)
    await get().fetch(input.projectPath)
  },

  update: async (id, patch) => {
    const server = getServer()
    if (!server) return
    await patchEnvVar(server.ip, server.port, id, patch)
    // Re-fetch with current project path from existing state
    const existing = get().envVars.find((v) => v.id === id)
    if (existing) await get().fetch(existing.projectPath)
  },

  remove: async (id) => {
    const server = getServer()
    if (!server) return
    const existing = get().envVars.find((v) => v.id === id)
    await deleteEnvVarById(server.ip, server.port, id)
    if (existing) await get().fetch(existing.projectPath)
  },

  bulkUpsert: async (projectPath, data) => {
    const server = getServer()
    if (!server) return
    const { envVars } = await patchBulkEnvVars(server.ip, server.port, { projectPath, data })
    set({ envVars })
  },

  resetForProjectChange: () => {
    set({ envVars: [], isLoading: false, error: null })
  },
}))
