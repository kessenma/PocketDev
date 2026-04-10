jest.mock('react-native', () => {
  const React = require('react')

  function createComponent(name) {
    return function MockComponent(props) {
      return React.createElement(name, props, props.children)
    }
  }

  return {
    KeyboardAvoidingView: createComponent('KeyboardAvoidingView'),
    Modal: createComponent('Modal'),
    Platform: { OS: 'ios' },
    SafeAreaView: createComponent('SafeAreaView'),
    ScrollView: createComponent('ScrollView'),
    StyleSheet: { create: (styles) => styles },
    Text: createComponent('Text'),
    TextInput: createComponent('TextInput'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
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
      panel: '#ffffff',
      panelAlt: '#f3f4f6',
    },
  }),
}))

jest.mock('@pocketdev/shared/theme', () => ({
  borderRadius: { lg: 16, xl: 20 },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16 },
  typographyScale: { base: {}, xs: {}, sm: {} },
}), { virtual: true })

jest.mock('../../theme/typography', () => ({
  typeStyles: {
    body: {},
    bodyStrong: {},
    bodySmall: {},
    meta: {},
    mono: {},
  },
}))

jest.mock('lucide-react-native', () => {
  const React = require('react')
  return {
    MessageCircleQuestion: (props) => React.createElement('Icon', props),
    X: (props) => React.createElement('Icon', props),
  }
})

jest.mock('../shared/BauhausButton', () => {
  const React = require('react')
  return function BauhausButton(props) {
    return React.createElement('BauhausButton', props, props.children)
  }
})

const questionsState = { current: [] }
const mockAnswerQuestion = jest.fn()

jest.mock('../../stores/tasks', () => ({
  useTaskStore: (selector) => selector({
    pendingQuestions: new Map([['task-1', questionsState.current]]),
    answerQuestion: mockAnswerQuestion,
  }),
}))

const React = require('react')
const renderer = require('react-test-renderer')
const { Text, TextInput } = require('react-native')
const TaskInteractionSheet = require('./TaskInteractionSheet').default

function renderSheet() {
  let tree
  renderer.act(() => {
    tree = renderer.create(React.createElement(TaskInteractionSheet, { taskId: 'task-1' }))
  })
  return tree
}

function collectText(tree) {
  return tree.root.findAllByType(Text).map((node) => {
    const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children]
    return children.filter((value) => typeof value === 'string').join('')
  })
}

function pressByLabel(tree, label) {
  const textNode = tree.root.findAllByType(Text).find((node) => {
    const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children]
    return children.join('') === label
  })

  let currentNode = textNode
  while (currentNode && typeof currentNode.props.onPress !== 'function') {
    currentNode = currentNode.parent
  }

  currentNode.props.onPress()
}

describe('TaskInteractionSheet', () => {
  beforeEach(() => {
    mockAnswerQuestion.mockReset()
    questionsState.current = []
  })

  it('renders form-style Codex questions and submits structured answers', () => {
    questionsState.current = [
      {
        questionId: 'rpc:44',
        taskId: 'task-1',
        provider: 'codex',
        prompt: 'Codex needs additional input before it can continue.',
        type: 'form',
        fields: [
          {
            id: 'target',
            header: 'Target',
            prompt: 'Which target should I use?',
            options: [
              { value: 'web', label: 'web', description: 'Run the web tests' },
              { value: 'mobile', label: 'mobile', description: 'Run the mobile tests' },
            ],
          },
          {
            id: 'note',
            prompt: 'Add a note for the run',
          },
        ],
      },
    ]

    const tree = renderSheet()
    const text = collectText(tree)
    expect(text).toContain('Codex needs additional input before it can continue.')
    expect(text).toContain('Which target should I use?')
    expect(text).toContain('Run the mobile tests')

    renderer.act(() => {
      pressByLabel(tree, 'mobile')
    })

    const inputs = tree.root.findAllByType(TextInput)
    renderer.act(() => {
      inputs[0].props.onChangeText('Smoke run')
    })

    const buttons = tree.root.findAll((node) => node.type === 'BauhausButton' && typeof node.props.onPress === 'function')
    renderer.act(() => {
      buttons[0].props.onPress()
    })

    expect(mockAnswerQuestion).toHaveBeenCalledWith(
      'task-1',
      'rpc:44',
      JSON.stringify({ target: 'mobile', note: 'Smoke run' }),
    )
  })
})
