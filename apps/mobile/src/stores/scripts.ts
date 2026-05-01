import { create } from 'zustand'
import type { ScriptPackageInfo } from '@pocketdev/shared/types'
import { fetchScripts } from '../services/api'
import { useConnectionStore } from './connection'
import { useTaskStore } from './tasks'
import { useFilesStore } from './files'

export type ScriptRunStatus = 'starting' | 'running' | 'completed' | 'failed'

export interface RunningScript {
  taskId: string
  scriptName: string
  packagePath: string
  detectedPort: number | null
  status: ScriptRunStatus
}

interface ScriptsState {
  packages: ScriptPackageInfo[]
  isLoading: boolean
  error: string | null
  runningScripts: Map<string, RunningScript>
  selectedPackageIndex: number

  fetchScripts: () => Promise<void>
  runScript: (packagePath: string, scriptName: string) => void
  runCommand: (packagePath: string, label: string, command: string, useRootCwd?: boolean, scriptName?: string) => void
  stopScript: (key: string) => void
  dismissScript: (key: string) => void
  selectPackage: (index: number) => void
  handleTaskOutput: (taskId: string, line: string) => void
  handleTaskStatusChange: (taskId: string, status: string) => void
  resetForProjectChange: () => void
}

// Same patterns the agent uses to detect dev server ports
const PORT_PATTERNS = [
  /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/,
  /listening on (?:port )?(\d+)/i,
  /server (?:running|started) (?:at|on) .*?:(\d+)/i,
]

function detectPort(line: string): number | null {
  const stripped = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
  for (const pattern of PORT_PATTERNS) {
    const match = stripped.match(pattern)
    if (match) {
      const port = Number(match[1])
      if (port > 0 && port < 65536) return port
    }
  }
  return null
}

function scriptKey(packagePath: string, scriptName: string): string {
  return `${packagePath}:${scriptName}`
}

export const useScriptsStore = create<ScriptsState>((set, get) => ({
  packages: [],
  isLoading: false,
  error: null,
  runningScripts: new Map(),
  selectedPackageIndex: 0,

  fetchScripts: async () => {
    const server = useConnectionStore.getState().server
    if (!server) return

    set({ isLoading: true, error: null })
    try {
      const result = await fetchScripts(server.ip, server.port)
      set({ packages: result.packages, isLoading: false, selectedPackageIndex: 0 })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch scripts',
      })
    }
  },

  runScript: (packagePath: string, scriptName: string) => {
    const { packages, runningScripts } = get()
    const pkg = packages.find((p) => p.path === packagePath)
    if (!pkg) return

    const rootPath = useFilesStore.getState().rootPath
    if (!rootPath) return

    const cwd = packagePath === '.' ? rootPath : `${rootPath}/${packagePath}`
    const command = `${pkg.packageManager} run ${scriptName}`

    useTaskStore.getState().startTask(command, 'shell', cwd, null, 'default', scriptName)

    const key = scriptKey(packagePath, scriptName)
    const next = new Map(runningScripts)
    next.set(key, {
      taskId: '',
      scriptName,
      packagePath,
      detectedPort: null,
      status: 'starting',
    })
    set({ runningScripts: next })
  },

  runCommand: (packagePath: string, label: string, command: string, useRootCwd?: boolean, scriptName?: string) => {
    const { runningScripts } = get()
    const rootPath = useFilesStore.getState().rootPath
    if (!rootPath) return

    const cwd = (packagePath === '.' || useRootCwd) ? rootPath : `${rootPath}/${packagePath}`
    useTaskStore.getState().startTask(command, 'shell', cwd, null, 'default', scriptName ?? label)

    const key = scriptKey(packagePath, label)
    const next = new Map(runningScripts)
    next.set(key, {
      taskId: '',
      scriptName: label,
      packagePath,
      detectedPort: null,
      status: 'starting',
    })
    set({ runningScripts: next })
  },

  stopScript: (key: string) => {
    const { runningScripts } = get()
    const running = runningScripts.get(key)
    if (!running?.taskId) return

    useTaskStore.getState().killTask(running.taskId)
  },

  dismissScript: (key: string) => {
    const { runningScripts } = get()
    const next = new Map(runningScripts)
    next.delete(key)
    set({ runningScripts: next })
  },

  selectPackage: (index: number) => set({ selectedPackageIndex: index }),

  handleTaskOutput: (taskId: string, line: string) => {
    const { runningScripts } = get()
    for (const [key, entry] of runningScripts) {
      if (entry.taskId === taskId && !entry.detectedPort) {
        const port = detectPort(line)
        if (port) {
          const next = new Map(runningScripts)
          next.set(key, { ...entry, detectedPort: port })
          set({ runningScripts: next })
        }
        return
      }
    }
  },

  handleTaskStatusChange: (taskId: string, status: string) => {
    const { runningScripts } = get()
    const next = new Map(runningScripts)
    let changed = false

    // First: try to find an entry that already has this taskId
    for (const [key, entry] of next) {
      if (entry.taskId === taskId) {
        const mappedStatus: ScriptRunStatus =
          status === 'completed' ? 'completed'
            : status === 'failed' || status === 'killed' ? 'failed'
              : 'running'
        next.set(key, { ...entry, status: mappedStatus })
        changed = true
        break
      }
    }

    // Second: if no match found, assign taskId to the first 'starting' entry
    if (!changed) {
      for (const [key, entry] of next) {
        if (entry.status === 'starting' && !entry.taskId) {
          const mappedStatus: ScriptRunStatus =
            status === 'completed' ? 'completed'
              : status === 'failed' || status === 'killed' ? 'failed'
                : 'running'
          next.set(key, { ...entry, taskId, status: mappedStatus })
          changed = true
          break
        }
      }
    }

    if (changed) set({ runningScripts: next })
  },

  resetForProjectChange: () => set({
    packages: [],
    isLoading: false,
    error: null,
    runningScripts: new Map(),
    selectedPackageIndex: 0,
  }),
}))
