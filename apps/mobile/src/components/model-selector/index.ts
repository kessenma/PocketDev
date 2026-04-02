/**
 * Docs: see `docs/model-selector/mobile-model-selector.md` for the workspace map,
 * entry points, and backend wiring notes. This module is mobile/client-side only
 * today and intentionally does not connect to the server agent yet.
 */
export { default as ModelSelector } from './ModelSelector'
export { MODEL_PROVIDERS, getDefaultModelSelection, getModelById, getProviderById, mergeServerAvailability } from './catalog'
export type { ModelProvider, ModelProviderId, SelectableModel } from './model'
