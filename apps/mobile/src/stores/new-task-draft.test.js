jest.mock('../services/api', () => ({
  fetchCapabilities: jest.fn(),
}))

jest.mock('../services/storage', () => ({
  getNewTaskDraft: jest.fn(() => null),
  saveNewTaskDraft: jest.fn(),
}))

jest.mock('./connection', () => ({
  useConnectionStore: {
    getState: () => ({
      server: { ip: '127.0.0.1', port: 8787, deviceId: 'device-1' },
    }),
  },
}))

const { fetchCapabilities } = require('../services/api')
const { useNewTaskDraftStore } = require('./new-task-draft')

describe('useNewTaskDraftStore', () => {
  const initialState = useNewTaskDraftStore.getState()

  beforeEach(() => {
    jest.clearAllMocks()
    useNewTaskDraftStore.setState({
      ...initialState,
      providers: null,
      isLoadingCapabilities: false,
      selectedProviderId: 'claude',
      selectedModelId: 'claude-opus',
    })
  })

  it('preserves the selected copilot model when capabilities still include it', async () => {
    useNewTaskDraftStore.setState({
      selectedProviderId: 'copilot',
      selectedModelId: 'gpt-5.4',
    })

    fetchCapabilities.mockResolvedValue({
      defaultProviderId: 'copilot',
      providers: [
        { id: 'claude', label: 'Claude', availability: 'available', version: '1.0.0' },
        { id: 'codex', label: 'Codex', availability: 'available', version: '1.0.0' },
        {
          id: 'copilot',
          label: 'GitHub Copilot',
          availability: 'available',
          version: '1.0.18',
          models: [
            {
              id: 'gpt-5.4',
              cliModelId: 'gpt-5.4',
              name: 'GPT-5.4',
              headline: 'Frontier GPT model available through Copilot',
              description: 'General-purpose GPT model available through Copilot model selection.',
              contextWindow: 'Managed by Copilot',
              premiumMultiplier: 1,
            },
            {
              id: 'claude-sonnet-4.6',
              cliModelId: 'claude-sonnet-4.6',
              name: 'Claude Sonnet 4.6',
              headline: 'Balanced Copilot model for daily coding',
              description: 'Good default for most coding, planning, and debugging tasks in Copilot.',
              contextWindow: 'Managed by Copilot',
              premiumMultiplier: 1,
            },
          ],
        },
      ],
    })

    await useNewTaskDraftStore.getState().loadCapabilities()

    const state = useNewTaskDraftStore.getState()
    const copilotProvider = state.providers.find((provider) => provider.id === 'copilot')

    expect(copilotProvider.models.map((model) => model.id)).toEqual([
      'gpt-5.4',
      'claude-sonnet-4.6',
    ])
    expect(state.selectedProviderId).toBe('copilot')
    expect(state.selectedModelId).toBe('gpt-5.4')
  })

  it('falls back to the first available copilot model when the selected model disappears', async () => {
    useNewTaskDraftStore.setState({
      selectedProviderId: 'copilot',
      selectedModelId: 'missing-model',
    })

    fetchCapabilities.mockResolvedValue({
      defaultProviderId: 'copilot',
      providers: [
        { id: 'claude', label: 'Claude', availability: 'available', version: '1.0.0' },
        { id: 'codex', label: 'Codex', availability: 'available', version: '1.0.0' },
        {
          id: 'copilot',
          label: 'GitHub Copilot',
          availability: 'available',
          version: '1.0.18',
          models: [
            {
              id: 'claude-sonnet-4.6',
              cliModelId: 'claude-sonnet-4.6',
              name: 'Claude Sonnet 4.6',
              headline: 'Balanced Copilot model for daily coding',
              description: 'Good default for most coding, planning, and debugging tasks in Copilot.',
              contextWindow: 'Managed by Copilot',
              premiumMultiplier: 1,
            },
            {
              id: 'gpt-5.4',
              cliModelId: 'gpt-5.4',
              name: 'GPT-5.4',
              headline: 'Frontier GPT model available through Copilot',
              description: 'General-purpose GPT model available through Copilot model selection.',
              contextWindow: 'Managed by Copilot',
              premiumMultiplier: 1,
            },
          ],
        },
      ],
    })

    await useNewTaskDraftStore.getState().loadCapabilities()

    const state = useNewTaskDraftStore.getState()
    expect(state.selectedProviderId).toBe('copilot')
    expect(state.selectedModelId).toBe('claude-sonnet-4.6')
  })
})
