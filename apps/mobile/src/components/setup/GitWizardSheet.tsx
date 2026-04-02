import React, { useReducer, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useSetupStore } from '../../stores/setup'
import { ChevronLeft, X, Check } from 'lucide-react-native'
import WizardStepper from './git-wizard/WizardStepper'
import DetectStep from './git-wizard/DetectStep'
import InstallGitStep from './git-wizard/InstallGitStep'
import GenerateKeyStep from './git-wizard/GenerateKeyStep'
import AddToGitHubStep from './git-wizard/AddToGitHubStep'
import TestConnectionStep from './git-wizard/TestConnectionStep'
import ConfigureIdentityStep from './git-wizard/ConfigureIdentityStep'
import type { GitSshStatus, GitWizardStep, GitWizardStepStatus } from '@pocketdev/shared/types'

interface Props {
  visible: boolean
  onClose: () => void
  onComplete: () => void
}

// ─── State machine ──────────────────────────────────────

const ALL_STEPS: GitWizardStep[] = [
  'detect', 'install', 'generate-key', 'add-to-github', 'test-connection', 'configure-identity',
]

interface WizardState {
  currentStep: GitWizardStep
  stepStatuses: Record<GitWizardStep, GitWizardStepStatus>
  sshStatus: GitSshStatus | null
  publicKey: string | null
  userName: string
  userEmail: string
  error: string | null
  allConfigured: boolean
}

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; sshStatus: GitSshStatus }
  | { type: 'STEP_COMPLETE'; step: GitWizardStep; publicKey?: string }
  | { type: 'STEP_FAILED'; step: GitWizardStep; error: string }
  | { type: 'GO_BACK' }
  | { type: 'SET_IDENTITY'; name: string; email: string }
  | { type: 'SET_PUBLIC_KEY'; key: string }
  | { type: 'RETRY' }

function getInitialState(): WizardState {
  const stepStatuses = {} as Record<GitWizardStep, GitWizardStepStatus>
  for (const step of ALL_STEPS) {
    stepStatuses[step] = step === 'detect' ? 'active' : 'pending'
  }
  return {
    currentStep: 'detect',
    stepStatuses,
    sshStatus: null,
    publicKey: null,
    userName: '',
    userEmail: '',
    error: null,
    allConfigured: false,
  }
}

function findNextActiveStep(statuses: Record<GitWizardStep, GitWizardStepStatus>, afterIndex: number): GitWizardStep | null {
  for (let i = afterIndex + 1; i < ALL_STEPS.length; i++) {
    if (statuses[ALL_STEPS[i]] === 'pending') return ALL_STEPS[i]
  }
  return null
}

function findPrevActiveStep(statuses: Record<GitWizardStep, GitWizardStepStatus>, beforeIndex: number): GitWizardStep | null {
  for (let i = beforeIndex - 1; i >= 1; i--) { // skip detect (index 0)
    const s = statuses[ALL_STEPS[i]]
    if (s === 'completed' || s === 'active') return ALL_STEPS[i]
  }
  return null
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'DETECTION_COMPLETE': {
      const ss = action.sshStatus
      const newStatuses = { ...state.stepStatuses }
      newStatuses['detect'] = 'completed'

      // Skip logic
      if (ss.git_installed) newStatuses['install'] = 'skipped'
      if (ss.ssh_key_exists) newStatuses['generate-key'] = 'skipped'
      if (ss.github_ssh_works) {
        newStatuses['add-to-github'] = 'skipped'
        newStatuses['test-connection'] = 'skipped'
      }
      if (ss.git_user_name && ss.git_user_email) newStatuses['configure-identity'] = 'skipped'

      // Check if everything is already configured
      const allSkipped = ALL_STEPS.slice(1).every((s) => newStatuses[s] === 'skipped')
      if (allSkipped) {
        return {
          ...state,
          currentStep: 'detect',
          stepStatuses: newStatuses,
          sshStatus: ss,
          userName: ss.git_user_name ?? '',
          userEmail: ss.git_user_email ?? '',
          allConfigured: true,
        }
      }

      // Find first pending step
      const firstPending = ALL_STEPS.find((s) => newStatuses[s] === 'pending')
      if (firstPending) newStatuses[firstPending] = 'active'

      return {
        ...state,
        currentStep: firstPending ?? 'detect',
        stepStatuses: newStatuses,
        sshStatus: ss,
        userName: ss.git_user_name ?? '',
        userEmail: ss.git_user_email ?? '',
        publicKey: null,
      }
    }

    case 'STEP_COMPLETE': {
      const newStatuses = { ...state.stepStatuses }
      newStatuses[action.step] = 'completed'

      const currentIndex = ALL_STEPS.indexOf(action.step)
      const next = findNextActiveStep(newStatuses, currentIndex)

      if (next) {
        newStatuses[next] = 'active'
      }

      return {
        ...state,
        currentStep: next ?? action.step,
        stepStatuses: newStatuses,
        publicKey: action.publicKey ?? state.publicKey,
        error: null,
        allConfigured: !next,
      }
    }

    case 'STEP_FAILED': {
      const newStatuses = { ...state.stepStatuses }
      newStatuses[action.step] = 'failed'
      return { ...state, stepStatuses: newStatuses, error: action.error }
    }

    case 'GO_BACK': {
      const currentIndex = ALL_STEPS.indexOf(state.currentStep)
      const prev = findPrevActiveStep(state.stepStatuses, currentIndex)
      if (!prev) return state

      const newStatuses = { ...state.stepStatuses }
      newStatuses[state.currentStep] = 'pending'
      newStatuses[prev] = 'active'

      return { ...state, currentStep: prev, stepStatuses: newStatuses, error: null }
    }

    case 'SET_IDENTITY':
      return { ...state, userName: action.name, userEmail: action.email }

    case 'SET_PUBLIC_KEY':
      return { ...state, publicKey: action.key }

    case 'RETRY': {
      const newStatuses = { ...state.stepStatuses }
      newStatuses[state.currentStep] = 'active'
      return { ...state, stepStatuses: newStatuses, error: null }
    }

    default:
      return state
  }
}

// ─── Component ──────────────────────────────────────────

export default function GitWizardSheet({ visible, onClose, onComplete }: Props) {
  const { colors } = useTheme()
  const fetchPrerequisites = useSetupStore((s) => s.fetchPrerequisites)
  const [state, dispatch] = useReducer(wizardReducer, undefined, getInitialState)

  const handleClose = useCallback(() => {
    fetchPrerequisites()
    onClose()
  }, [fetchPrerequisites, onClose])

  const handleDone = useCallback(() => {
    fetchPrerequisites()
    onComplete()
  }, [fetchPrerequisites, onComplete])

  const canGoBack = ALL_STEPS.indexOf(state.currentStep) > 1 && !state.allConfigured

  function renderStep() {
    if (state.allConfigured) {
      return (
        <View style={styles.completedContainer}>
          <View style={[styles.completedIcon, { backgroundColor: colors.primary }]}>
            <Check color={colors.primaryText} size={32} strokeWidth={2.5} />
          </View>
          <Text style={[styles.completedTitle, { color: colors.text }]}>Git is ready!</Text>
          <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
            Your server is fully configured for Git and GitHub.
          </Text>
          {state.sshStatus?.github_username && (
            <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>
              Connected as @{state.sshStatus.github_username}
            </Text>
          )}
          {state.userName && (
            <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>
              {state.userName} {'<'}{state.userEmail}{'>'}
            </Text>
          )}
        </View>
      )
    }

    switch (state.currentStep) {
      case 'detect':
        return <DetectStep dispatch={dispatch} />
      case 'install':
        return <InstallGitStep dispatch={dispatch} />
      case 'generate-key':
        return (
          <GenerateKeyStep
            dispatch={dispatch}
            sshStatus={state.sshStatus}
            publicKey={state.publicKey}
          />
        )
      case 'add-to-github':
        return <AddToGitHubStep dispatch={dispatch} publicKey={state.publicKey} />
      case 'test-connection':
        return <TestConnectionStep dispatch={dispatch} />
      case 'configure-identity':
        return (
          <ConfigureIdentityStep
            dispatch={dispatch}
            initialName={state.userName}
            initialEmail={state.userEmail}
          />
        )
      default:
        return null
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          {canGoBack ? (
            <TouchableOpacity onPress={() => dispatch({ type: 'GO_BACK' })} style={styles.headerButton}>
              <ChevronLeft color={colors.text} size={22} strokeWidth={2.25} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>Git Setup</Text>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <X color={colors.textTertiary} size={20} strokeWidth={2.25} />
          </TouchableOpacity>
        </View>

        {/* Stepper (hidden during detect and completion) */}
        {state.currentStep !== 'detect' && !state.allConfigured && (
          <WizardStepper currentStep={state.currentStep} stepStatuses={state.stepStatuses} />
        )}

        {/* Step content */}
        <View style={styles.content}>{renderStep()}</View>

        {/* Footer */}
        {state.allConfigured && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
              onPress={handleDone}
              activeOpacity={0.7}
            >
              <Text style={[styles.doneText, { color: colors.primaryText }]}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typographyScale.lg,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
  },
  completedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  completedTitle: {
    ...typographyScale['2xl'],
    fontWeight: '700',
  },
  completedSubtitle: {
    ...typographyScale.base,
    textAlign: 'center',
  },
  completedDetail: {
    ...typographyScale.sm,
    fontFamily: 'monospace',
  },
  footer: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
  },
  doneButton: {
    width: '100%',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  doneText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
})
