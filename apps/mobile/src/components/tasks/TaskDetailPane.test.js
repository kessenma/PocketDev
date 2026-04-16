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
    Pressable: createComponent('Pressable'),
    StyleSheet: { create: (styles) => styles, hairlineWidth: 1 },
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    View: createComponent('View'),
  }
})

jest.mock('@react-native-clipboard/clipboard', () => ({ setString: jest.fn() }))

jest.mock('@shopify/flash-list', () => {
  const React = require('react')
  return {
    FlashList: React.forwardRef((props, _ref) => React.createElement('FlashList', props, props.ListHeaderComponent, props.ListEmptyComponent)),
  }
})

jest.mock('react-native-enriched-markdown', () => {
  const React = require('react')
  return {
    EnrichedMarkdownText: (props) => React.createElement('EnrichedMarkdownText', props, props.markdown),
  }
})

jest.mock('@pocketdev/shared/theme', () => ({
  borderRadius: { md: 12, lg: 16, xl: 20 },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 },
}))

jest.mock('../../theme/typography', () => ({
  typeStyles: {
    meta: {},
    body: {},
    bodySmall: {},
    bodyStrong: {},
    mono: {},
    screenTitle: {},
  },
}))

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#2563eb',
      primaryText: '#fff',
      text: '#111827',
      textSecondary: '#374151',
      textTertiary: '#6b7280',
      border: '#d1d5db',
      panel: '#fff',
      panelAlt: '#f3f4f6',
      accentRed: '#ef4444',
    },
  }),
}))

jest.mock('../../hooks/useToast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

jest.mock('../shared/BauhausBadge', () => {
  const React = require('react')
  return function BauhausBadge(props) {
    return React.createElement('BauhausBadge', props, props.label)
  }
})

jest.mock('../shared/BauhausButton', () => {
  const React = require('react')
  return function BauhausButton(props) {
    return React.createElement('BauhausButton', props, props.children)
  }
})

jest.mock('../shared/BauhausChatInput', () => {
  const React = require('react')
  return function BauhausChatInput(props) {
    return React.createElement('BauhausChatInput', props)
  }
})

jest.mock('./ActivityCards', () => ({
  GroupedItemRow: () => null,
}))

jest.mock('./TaskConversation', () => {
  const React = require('react')
  return function TaskConversation(props) {
    return React.createElement('TaskConversation', props)
  }
})

jest.mock('./TaskInteractionSheet', () => {
  const React = require('react')
  return function TaskInteractionSheet(props) {
    return React.createElement('TaskInteractionSheet', props)
  }
})

jest.mock('./TaskDebugSheet', () => {
  const React = require('react')
  return function TaskDebugSheet(props) {
    return React.createElement('TaskDebugSheet', props)
  }
})

jest.mock('../setup/CodexWizardSheet', () => {
  const React = require('react')
  return function CodexWizardSheet(props) {
    return React.createElement('CodexWizardSheet', props)
  }
})

jest.mock('lucide-react-native', () => {
  const React = require('react')
  const makeIcon = (name) => (props) => React.createElement(name, props)
  return {
    Bug: makeIcon('Bug'),
    Check: makeIcon('Check'),
    Copy: makeIcon('Copy'),
    FileText: makeIcon('FileText'),
    GalleryVerticalEnd: makeIcon('GalleryVerticalEnd'),
    Info: makeIcon('Info'),
    Layers: makeIcon('Layers'),
    MessageSquare: makeIcon('MessageSquare'),
    ShieldAlert: makeIcon('ShieldAlert'),
    SquareTerminal: makeIcon('SquareTerminal'),
    Terminal: makeIcon('Terminal'),
  }
})

const state = {
  task: null,
  logs: [],
  activities: [],
  turns: [],
  pendingPermissions: [],
  report: null,
}

jest.mock('../../stores/tasks', () => ({
  useTaskStore: (selector) => selector({
    tasks: new Map(state.task ? [[state.task.id, state.task]] : []),
    taskLogs: new Map(state.task ? [[state.task.id, state.logs]] : []),
    taskActivities: new Map(state.task ? [[state.task.id, state.activities]] : []),
    taskTurns: new Map(state.task ? [[state.task.id, state.turns]] : []),
    pendingPermissions: new Map(state.task ? [[state.task.id, state.pendingPermissions]] : []),
    killTask: jest.fn(),
    clearPermissions: jest.fn(),
    startTask: jest.fn(),
    continueTask: jest.fn(),
    loadTurnsForTask: jest.fn(),
    loadLogsForTask: jest.fn(),
  }),
}))

jest.mock('../../stores/setup', () => ({
  useSetupStore: (selector) => selector({ report: state.report }),
}))

const React = require('react')
const renderer = require('react-test-renderer')
const { Text, TouchableOpacity } = require('react-native')
const TaskDetailPane = require('./TaskDetailPane').default

function renderPane(props = {}) {
  let tree
  renderer.act(() => {
    tree = renderer.create(React.createElement(TaskDetailPane, {
      taskId: state.task?.id ?? null,
      ...props,
    }))
  })
  return tree
}

function pressBugButton(tree) {
  const bugNode = tree.root.findByType('Bug')
  let current = bugNode.parent
  while (current && current.type !== TouchableOpacity) {
    current = current.parent
  }
  renderer.act(() => {
    current.props.onPress()
  })
}

describe('TaskDetailPane', () => {
  beforeEach(() => {
    state.task = {
      id: 'task-1',
      prompt: 'User request:\nHello',
      agent_type: 'codex',
      mode: 'default',
      model: 'gpt-5.3-codex',
      status: 'failed',
      working_directory: null,
      project_id: null,
      project_name: null,
      session_id: null,
      turn_count: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      started_at: '2026-01-01T00:00:00.000Z',
      completed_at: '2026-01-01T00:00:01.000Z',
    }
    state.logs = []
    state.activities = []
    state.turns = []
    state.pendingPermissions = []
    state.report = null
  })

  it('always renders the bug button and opens the debug sheet', () => {
    const tree = renderPane()
    expect(tree.root.findByType('Bug')).toBeTruthy()

    pressBugButton(tree)

    const debugSheet = tree.root.findByType('TaskDebugSheet')
    expect(debugSheet.props.visible).toBe(true)
  })

  it('preselects auth when codex auth-failure logs are present', () => {
    state.logs = ['Provided authentication token is expired. token_expired']
    const tree = renderPane()

    pressBugButton(tree)

    const debugSheet = tree.root.findByType('TaskDebugSheet')
    expect(debugSheet.props.selection).toBe('auth')
  })

  it('leaves the debug selection empty when there is no task context', () => {
    state.task = null
    state.logs = ['401 Unauthorized']

    const tree = renderPane({
      emptyTitle: 'No task',
      emptyBody: 'No task selected.',
    })

    pressBugButton(tree)

    const debugSheet = tree.root.findByType('TaskDebugSheet')
    expect(debugSheet.props.selection).toBeNull()
  })
})
