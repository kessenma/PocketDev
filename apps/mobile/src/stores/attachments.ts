import { create } from 'zustand'
import { createMMKV } from 'react-native-mmkv'

const storage = createMMKV({ id: 'pocketdev-attachments' })

export type PendingFile = {
  uri: string
  name: string
  size: number
  type: string
  serverFilename?: string
  serverFolder?: string
  uploading: boolean
  error?: string
}

type AttachmentState = {
  pendingFiles: PendingFile[]
  consentGiven: boolean

  addPendingFile: (file: PendingFile) => void
  updatePendingFile: (name: string, patch: Partial<PendingFile>) => void
  removePendingFile: (name: string) => void
  clearPendingFiles: () => void
  setConsentGiven: (v: boolean) => void
  isUploading: () => boolean
}

export const useAttachmentStore = create<AttachmentState>()((set, get) => ({
  pendingFiles: [],
  consentGiven: storage.getBoolean('consentGiven') ?? false,

  addPendingFile: (file) =>
    set((s) => ({ pendingFiles: [...s.pendingFiles, file] })),

  updatePendingFile: (name, patch) =>
    set((s) => ({
      pendingFiles: s.pendingFiles.map((f) => (f.name === name ? { ...f, ...patch } : f)),
    })),

  removePendingFile: (name) =>
    set((s) => ({ pendingFiles: s.pendingFiles.filter((f) => f.name !== name) })),

  clearPendingFiles: () => set({ pendingFiles: [] }),

  setConsentGiven: (v) => {
    storage.set('consentGiven', v)
    set({ consentGiven: v })
  },

  isUploading: () => get().pendingFiles.some((f) => f.uploading),
}))
