/**
 * Docs: see `docs/model-selector/mobile-model-selector.md` for the workspace map,
 * entry points, and backend wiring notes. Claude and Codex use the local
 * curated catalog, while Copilot models can be merged from server capabilities.
 */
export { default as ModelSelector } from './ModelSelector'
export { MODEL_PROVIDERS, getDefaultModelSelection, getModelById, getProviderById, getCliModelId, mergeServerAvailability } from './catalog'
export type { ModelProvider, ModelProviderId, SelectableModel } from './model'
