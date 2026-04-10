import { create } from 'zustand'
import type { ProjectSummary } from '@pocketdev/shared/types'
import {
  fetchProjects,
  postCloneProject,
  postCreateProjectBranch,
  postSelectProject,
} from '../services/api'
import { useConnectionStore } from './connection'
import { useFilesStore } from './files'
import { useGitStore } from './git'
import { usePreviewStore } from './preview'
import { useEnvStore } from './env'

type ProjectsState = {
  projects: ProjectSummary[]
  githubUsername: string | null
  isLoading: boolean
  isMutating: boolean
  mutatingProjectId: string | null
  mutatingAction: 'clone' | 'select' | 'branch' | null
  cloneCelebrationProjectId: string | null
  lastActionMessage: string
  error: string | null
  clearCloneCelebration: () => void
  refresh: () => Promise<void>
  selectProject: (projectId: string, pullLatest?: boolean) => Promise<void>
  cloneProject: (projectId: string, branchMode: 'default' | 'new', newBranchName?: string) => Promise<void>
  createBranch: (projectId: string, branchName: string) => Promise<void>
}

function getServer() {
  return useConnectionStore.getState().server
}

async function refreshRepoAwareStores() {
  useFilesStore.getState().resetForProjectSwitch()
  usePreviewStore.getState().resetForProjectChange()
  useEnvStore.getState().resetForProjectChange()
  await Promise.allSettled([
    useFilesStore.getState().refresh(),
    useGitStore.getState().refresh(),
  ])
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  githubUsername: null,
  isLoading: false,
  isMutating: false,
  mutatingProjectId: null,
  mutatingAction: null,
  cloneCelebrationProjectId: null,
  lastActionMessage: 'Load repositories from your paired server.',
  error: null,

  clearCloneCelebration: () => {
    set({ cloneCelebrationProjectId: null })
  },

  refresh: async () => {
    const server = getServer()
    if (!server) {
      set({ error: 'Not connected', lastActionMessage: 'Not connected to server.' })
      return
    }

    set({ isLoading: true, error: null, lastActionMessage: 'Loading repositories...' })
    try {
      const result = await fetchProjects(server.ip, server.port)
      set({
        projects: result.projects,
        githubUsername: result.githubUsername,
        isLoading: false,
        lastActionMessage: `Loaded ${result.projects.length} repositories.`,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load repositories',
        lastActionMessage: 'Failed to load repositories.',
      })
    }
  },

  selectProject: async (projectId, pullLatest = false) => {
    const server = getServer()
    if (!server) return

    set({ isMutating: true, mutatingProjectId: projectId, mutatingAction: 'select', error: null, lastActionMessage: 'Switching repository...' })
    try {
      await postSelectProject(server.ip, server.port, projectId, pullLatest)
      await Promise.all([useProjectsStore.getState().refresh(), refreshRepoAwareStores()])
      set({
        isMutating: false,
        mutatingProjectId: null,
        mutatingAction: null,
        lastActionMessage: pullLatest ? 'Repository switched and updated.' : 'Repository switched.',
      })
    } catch (error) {
      set({
        isMutating: false,
        mutatingProjectId: null,
        mutatingAction: null,
        error: error instanceof Error ? error.message : 'Failed to switch repository',
        lastActionMessage: 'Failed to switch repository.',
      })
    }
  },

  cloneProject: async (projectId, branchMode, newBranchName) => {
    const server = getServer()
    if (!server) return

    set({ isMutating: true, mutatingProjectId: projectId, mutatingAction: 'clone', error: null, lastActionMessage: 'Cloning repository...' })
    try {
      const result = await postCloneProject(server.ip, server.port, projectId, branchMode, newBranchName)
      await Promise.all([useProjectsStore.getState().refresh(), refreshRepoAwareStores()])
      set({
        isMutating: false,
        mutatingProjectId: null,
        mutatingAction: null,
        cloneCelebrationProjectId: result.project.id,
        lastActionMessage: branchMode === 'new' ? 'Repository cloned and branch created.' : 'Repository cloned.',
      })
    } catch (error) {
      set({
        isMutating: false,
        mutatingProjectId: null,
        mutatingAction: null,
        error: error instanceof Error ? error.message : 'Failed to clone repository',
        lastActionMessage: 'Failed to clone repository.',
      })
    }
  },

  createBranch: async (projectId, branchName) => {
    const server = getServer()
    if (!server) return

    set({ isMutating: true, mutatingProjectId: projectId, mutatingAction: 'branch', error: null, lastActionMessage: 'Creating branch...' })
    try {
      await postCreateProjectBranch(server.ip, server.port, projectId, branchName)
      await Promise.all([useProjectsStore.getState().refresh(), refreshRepoAwareStores()])
      set({
        isMutating: false,
        mutatingProjectId: null,
        mutatingAction: null,
        lastActionMessage: `Created ${branchName}.`,
      })
    } catch (error) {
      set({
        isMutating: false,
        mutatingProjectId: null,
        mutatingAction: null,
        error: error instanceof Error ? error.message : 'Failed to create branch',
        lastActionMessage: 'Failed to create branch.',
      })
    }
  },
}))
