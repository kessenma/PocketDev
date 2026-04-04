import { create } from 'zustand'
import { browserSessionUrl, postCreateBrowserSession } from '../services/api'
import { useConnectionStore } from './connection'

export type PreviewStatus = 'idle' | 'connecting' | 'loaded' | 'failed'

type PreviewState = {
  visible: boolean
  sessionId: string | null
  targetUrl: string
  proxiedUrl: string | null
  status: PreviewStatus
  lastError: string | null
  openPreview: (targetUrl?: string) => Promise<void>
  markLoaded: () => void
  markFailed: (error: string) => void
  closePreview: () => void
  resetForProjectChange: () => void
}

const DEFAULT_TARGET_URL = 'http://localhost:3000'

export const usePreviewStore = create<PreviewState>((set) => ({
  visible: false,
  sessionId: null,
  targetUrl: DEFAULT_TARGET_URL,
  proxiedUrl: null,
  status: 'idle',
  lastError: null,

  openPreview: async (targetUrl = DEFAULT_TARGET_URL) => {
    const server = useConnectionStore.getState().server
    if (!server) {
      set({
        visible: false,
        status: 'failed',
        lastError: 'Not connected to server.',
      })
      return
    }

    set({
      visible: true,
      sessionId: null,
      targetUrl,
      proxiedUrl: null,
      status: 'connecting',
      lastError: null,
    })

    try {
      const result = await postCreateBrowserSession(server.ip, server.port, targetUrl)
      set({
        visible: true,
        sessionId: result.session_id,
        targetUrl: result.target_url,
        proxiedUrl: browserSessionUrl(server.ip, server.port, result.proxied_url),
        status: 'connecting',
        lastError: null,
      })
    } catch (error) {
      set({
        visible: true,
        sessionId: null,
        targetUrl,
        proxiedUrl: null,
        status: 'failed',
        lastError: error instanceof Error ? error.message : 'Failed to create preview session.',
      })
    }
  },

  markLoaded: () => set((state) => ({
    ...state,
    status: 'loaded',
    lastError: null,
  })),

  markFailed: (error) => set((state) => ({
    ...state,
    status: 'failed',
    lastError: error,
  })),

  closePreview: () => set((state) => ({
    ...state,
    visible: false,
  })),

  resetForProjectChange: () => set({
    visible: false,
    sessionId: null,
    targetUrl: DEFAULT_TARGET_URL,
    proxiedUrl: null,
    status: 'idle',
    lastError: null,
  }),
}))
