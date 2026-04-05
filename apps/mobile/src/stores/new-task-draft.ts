import { create } from 'zustand'
import {
  getNewTaskDraft,
  saveNewTaskDraft,
  type StoredNewTaskDraft,
} from '../services/storage'
import { fetchCapabilities } from '../services/api'
import {
  getDefaultModelSelection,
  getModelById,
  getProviderById,
  mergeServerAvailability,
} from '../components/model-selector/catalog'
import type { ModelProvider, ModelProviderId } from '../components/model-selector/model'
import { useConnectionStore } from './connection'

type NewTaskDraftState = StoredNewTaskDraft & {
  providers: ModelProvider[] | null
  isLoadingCapabilities: boolean
  setPrompt: (prompt: string) => void
  applyRecentPrompt: (prompt: string) => void
  selectTaskMode: (mode: StoredNewTaskDraft['selectedTaskMode']) => void
  selectProvider: (providerId: ModelProviderId) => void
  selectModel: (providerId: ModelProviderId, modelId: string) => void
  submitDraft: () => void
  resetDraftMessage: () => void
  loadCapabilities: () => void
}

const defaultSelection = getDefaultModelSelection()

function getInitialState(): StoredNewTaskDraft {
  const stored = getNewTaskDraft()
  if (!stored) {
    return {
      prompt: '',
      selectedProviderId: defaultSelection.selectedProviderId,
      selectedModelId: defaultSelection.selectedModelId,
      selectedTaskMode: 'default',
      lastActionMessage: 'Select a provider and model, then write your prompt.',
    }
  }

  const provider = getProviderById(stored.selectedProviderId as ModelProviderId)
  const model = provider.models.find((entry) => entry.id === stored.selectedModelId)

  return {
    prompt: stored.prompt,
    selectedProviderId: provider.id,
    selectedModelId: model?.id ?? provider.models[0].id,
    selectedTaskMode: stored.selectedTaskMode,
    lastActionMessage: stored.lastActionMessage,
  }
}

function persistDraft(state: StoredNewTaskDraft) {
  saveNewTaskDraft(state)
}

export const useNewTaskDraftStore = create<NewTaskDraftState>((set, get) => ({
  ...getInitialState(),
  providers: null,
  isLoadingCapabilities: false,

  setPrompt: (prompt) => {
    set((state) => {
      const nextState = { ...state, prompt }
      persistDraft(nextState)
      return nextState
    })
  },

  applyRecentPrompt: (prompt) => {
    set((state) => {
      const nextState = { ...state, prompt }
      persistDraft(nextState)
      return nextState
    })
  },

  selectTaskMode: (selectedTaskMode) => {
    set((state) => {
      const nextState = { ...state, selectedTaskMode }
      persistDraft(nextState)
      return nextState
    })
  },

  selectProvider: (providerId) => {
    set((state) => {
      const provider = getProviderById(providerId)
      const hasCurrentModel = provider.models.some(
        (model) => model.id === state.selectedModelId,
      )
      const nextState = {
        ...state,
        selectedProviderId: provider.id,
        selectedModelId: hasCurrentModel ? state.selectedModelId : provider.models[0].id,
      }
      persistDraft(nextState)
      return nextState
    })
  },

  selectModel: (providerId, modelId) => {
    set((state) => {
      const provider = getProviderById(providerId)
      const model = getModelById(provider.id, modelId)
      const nextState = {
        ...state,
        selectedProviderId: provider.id,
        selectedModelId: model.id,
      }
      persistDraft(nextState)
      return nextState
    })
  },

  submitDraft: () => {
    set((state) => {
      const provider = getProviderById(state.selectedProviderId as ModelProviderId)
      const model = getModelById(provider.id, state.selectedModelId)
      const promptSummary = state.prompt.trim().length > 0 ? 'Prompt draft saved.' : 'Selection saved.'
      const nextState = {
        ...state,
        lastActionMessage: `${promptSummary} ${provider.label} / ${model.name} selected.`,
      }
      persistDraft(nextState)
      return nextState
    })
  },

  resetDraftMessage: () => {
    set((state) => {
      const nextState = {
        ...state,
        lastActionMessage: 'Select a provider and model, then write your prompt.',
      }
      persistDraft(nextState)
      return nextState
    })
  },

  loadCapabilities: async () => {
    if (get().isLoadingCapabilities) return

    const server = useConnectionStore.getState().server
    if (!server) return

    set({ isLoadingCapabilities: true })

    try {
      const capabilities = await fetchCapabilities(server.ip, server.port)
      const providers = mergeServerAvailability(capabilities)

      // Auto-select first available provider if current selection is unavailable
      const currentProviderId = get().selectedProviderId
      const currentProvider = providers.find((p) => p.id === currentProviderId)
      const currentAvailable = currentProvider?.availability === 'available'

      if (!currentAvailable) {
        const firstAvailable = providers.find((p) => p.availability === 'available')
        if (firstAvailable) {
          set({
            providers,
            isLoadingCapabilities: false,
            selectedProviderId: firstAvailable.id,
            selectedModelId: firstAvailable.models[0]?.id ?? get().selectedModelId,
          })
          return
        }
      }

      set({ providers, isLoadingCapabilities: false })
    } catch {
      set({
        isLoadingCapabilities: false,
      })
    }
  },
}))
