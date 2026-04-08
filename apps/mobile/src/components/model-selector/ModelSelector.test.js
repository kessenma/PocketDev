jest.mock('react-native', () => {
  const React = require('react')

  function createComponent(name) {
    return function MockComponent(props) {
      return React.createElement(name, props, props.children)
    }
  }

  return {
    View: createComponent('View'),
    Text: createComponent('Text'),
    Image: createComponent('Image'),
    Pressable: createComponent('Pressable'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    StyleSheet: {
      create: (styles) => styles,
      hairlineWidth: 1,
    },
    useColorScheme: () => 'light',
  }
})

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#2563eb',
      primaryText: '#ffffff',
      text: '#111827',
      textSecondary: '#374151',
      textTertiary: '#6b7280',
      border: '#d1d5db',
      background: '#ffffff',
      backgroundSecondary: '#f3f4f6',
      surface: '#ffffff',
    },
  }),
}))

jest.mock('@pocketdev/shared/theme', () => ({
  borderRadius: { md: 12, lg: 16 },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16 },
}), { virtual: true })

jest.mock('../../theme/typography', () => ({
  typeStyles: {
    labelStrong: {},
    meta: {},
    screenTitle: {},
    bodySmall: {},
  },
}))

jest.mock('../../../assets', () => ({
  Assets: {
    claudeBlack: 1,
    claudeWhite: 2,
    codexBlack: 3,
    codexWhite: 4,
    githubCopilotBlack: 5,
    githubCopilotWhite: 6,
  },
}))

jest.mock('lucide-react-native', () => {
  const React = require('react')

  function Icon(props) {
    return React.createElement('Icon', props, props.children)
  }

  return {
    ChevronDown: Icon,
    ChevronUp: Icon,
    Check: Icon,
  }
})

const React = require('react')
const renderer = require('react-test-renderer')
const { Text } = require('react-native')
const { MODEL_PROVIDERS } = require('./catalog')
const ModelSelector = require('./ModelSelector').default

function Harness({ providers = MODEL_PROVIDERS, initialProviderId = 'claude', initialModelId = 'claude-sonnet' }) {
  const [selectedProviderId, setSelectedProviderId] = React.useState(initialProviderId)
  const [selectedModelId, setSelectedModelId] = React.useState(initialModelId)

  return React.createElement(ModelSelector, {
    providers,
    selectedProviderId,
    selectedModelId,
    onSelectProvider: (providerId) => {
      setSelectedProviderId(providerId)
      const provider = providers.find((entry) => entry.id === providerId)
      setSelectedModelId(provider.models[0].id)
    },
    onSelectModel: (_providerId, modelId) => setSelectedModelId(modelId),
  })
}

function renderSelector(props) {
  let tree

  renderer.act(() => {
    tree = renderer.create(
      React.createElement(Harness, props),
    )
  })

  return tree
}

function collectText(tree) {
  return tree.root.findAllByType(Text).map((node) => {
    const children = Array.isArray(node.props.children)
      ? node.props.children
      : [node.props.children]

    return children.filter((value) => typeof value === 'string').join('')
  })
}

function pressByLabel(tree, label) {
  const textNode = tree.root.findAllByType(Text).find((node) => {
    const children = Array.isArray(node.props.children)
      ? node.props.children
      : [node.props.children]

    return children.join('') === label
  })

  let currentNode = textNode
  while (currentNode && typeof currentNode.props.onPress !== 'function') {
    currentNode = currentNode.parent
  }

  currentNode.props.onPress()
}

describe('ModelSelector', () => {
  it('renders the default provider models', () => {
    const tree = renderSelector()
    const text = collectText(tree)

    expect(text).toContain('Claude')
    expect(text).toContain('Claude Sonnet 4.6')
    expect(text).toContain('Claude Opus 4.6')
    expect(text).not.toContain('GPT-5.4')
  })

  it('updates the model list when the provider changes', () => {
    const tree = renderSelector()

    renderer.act(() => {
      pressByLabel(tree, 'Codex')
    })

    const text = collectText(tree)

    expect(text).toContain('GPT-5.4')
    expect(text).toContain('GPT-5.3 Codex')
    expect(text).not.toContain('Claude Opus 4.6')
  })

  it('updates the selected model within the current provider', () => {
    const tree = renderSelector()

    renderer.act(() => {
      pressByLabel(tree, 'Claude Opus 4.6')
    })

    const text = collectText(tree)
    expect(text).toContain('Claude Opus 4.6')
    expect(text).toContain('Deep reasoning for harder refactors')
  })

  it('renders server-provided copilot models', () => {
    const providers = MODEL_PROVIDERS.map((provider) => (
      provider.id === 'copilot'
        ? {
            ...provider,
            availability: 'available',
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
          }
        : provider
    ))
    const tree = renderSelector({
      providers,
      initialProviderId: 'copilot',
      initialModelId: 'claude-sonnet-4.6',
    })
    const text = collectText(tree)

    expect(text).toContain('Claude Sonnet 4.6')
    expect(text).toContain('GPT-5.4')
  })
})
