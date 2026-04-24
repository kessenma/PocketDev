import React, { useReducer, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useSetupStore } from '../../stores/setup'
import { Assets } from '../../../assets'
import { ChevronLeft, X, Check } from 'lucide-react-native'
import SetupWizardScreen from './SetupWizardScreen'
import WizardStepper from './codex-wizard/WizardStepper'
import DetectStep from './codex-wizard/DetectStep'
import AuthenticateStep from './codex-wizard/AuthenticateStep'
import VerifyStep from './codex-wizard/VerifyStep'
import type {
  OpenCodeProviderAuthStatus,
  OpenAIOpenCodeAuthSessionStatus,
  CodexWizardStep,
  CodexWizardStepStatus,
} from '@pocketdev/shared/types'

interface Props {
  onDismiss: () => void
  onComplete: () => void
  entryMode?: 'full' | 'auth_repair'
}

const ALL_STEPS: CodexWizardStep[] = ['detect', 'authenticate', 'verify']

interface WizardState {
  currentStep: CodexWizardStep
  stepStatuses: Record<CodexWizardStep, CodexWizardStepStatus>
  providerStatus: OpenCodeProviderAuthStatus | null
  authSession: OpenAIOpenCodeAuthSessionStatus | null
  error: string | null
  allConfigured: boolean
}

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; providerStatus: OpenCodeProviderAuthStatus }
  | { type: 'STEP_COMPLETE'; step: CodexWizardStep }
  | { type: 'STEP_FAILED'; step: CodexWizardStep; error: string }
  | { type: 'GO_BACK' }
  | { type: 'SET_AUTH_SESSION'; authSession: OpenAIOpenCodeAuthSessionStatus | null }
  | { type: 'RETRY' }

function getInitialStateForMode(entryMode: Props['entryMode'] = 'full'): WizardState {
  const stepStatuses = {} as Record<CodexWizardStep, CodexWizardStepStatus>
  for (const step of ALL_STEPS) {
    stepStatuses[step] = 'pending'
  }

  if (entryMode === 'auth_repair') {
    stepStatuses.detect = 'skipped'
    stepStatuses.authenticate = 'active'
    stepStatuses.verify = 'pending'

    return {
      currentStep: 'authenticate',
      stepStatuses,
      providerStatus: null,
      authSession: null,
      error: null,
      allConfigured: false,
    }
  }

  stepStatuses.detect = 'active'
  return {
    currentStep: 'detect',
    stepStatuses,
    providerStatus: null,
    authSession: null,
    error: null,
    allConfigured: false,
  }
}

function findNextPendingStep(statuses: Record<CodexWizardStep, CodexWizardStepStatus>, afterIndex: number): CodexWizardStep | null {
  for (let i = afterIndex + 1; i < ALL_STEPS.length; i++) {
    if (statuses[ALL_STEPS[i]] === 'pending') return ALL_STEPS[i]
  }
  return null
}

function findPrevStep(statuses: Record<CodexWizardStep, CodexWizardStepStatus>, beforeIndex: number): CodexWizardStep | null {
  for (let i = beforeIndex - 1; i >= 1; i--) {
    const status = statuses[ALL_STEPS[i]]
    if (status === 'completed' || status === 'active') return ALL_STEPS[i]
  }
  return null
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'DETECTION_COMPLETE': {
      const providerStatus = action.providerStatus
      const newStatuses = { ...state.stepStatuses }
      newStatuses.detect = 'completed'

      if (providerStatus.authenticated) {
        newStatuses.authenticate = 'skipped'
        newStatuses.verify = 'skipped'
        return {
          ...state,
          currentStep: 'detect',
          stepStatuses: newStatuses,
          providerStatus,
          authSession: null,
          allConfigured: true,
        }
      }

      newStatuses.authenticate = 'active'
      return {
        ...state,
        currentStep: 'authenticate',
        stepStatuses: newStatuses,
        providerStatus,
        authSession: null,
      }
    }

    case 'STEP_COMPLETE': {
      const newStatuses = { ...state.stepStatuses }
      newStatuses[action.step] = 'completed'

      const currentIndex = ALL_STEPS.indexOf(action.step)
      const next = findNextPendingStep(newStatuses, currentIndex)

      if (next) newStatuses[next] = 'active'

      return {
        ...state,
        currentStep: next ?? action.step,
        stepStatuses: newStatuses,
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
      const previous = findPrevStep(state.stepStatuses, currentIndex)
      if (!previous) return state

      const newStatuses = { ...state.stepStatuses }
      newStatuses[state.currentStep] = 'pending'
      newStatuses[previous] = 'active'

      return { ...state, currentStep: previous, stepStatuses: newStatuses, error: null }
    }

    case 'SET_AUTH_SESSION':
      return { ...state, authSession: action.authSession }

    case 'RETRY': {
      const newStatuses = { ...state.stepStatuses }
      newStatuses[state.currentStep] = 'active'
      return { ...state, stepStatuses: newStatuses, error: null }
    }

    default:
      return state
  }
}

export default function CodexWizardSheet({ onDismiss, onComplete, entryMode = 'full' }: Props) {
  const { colors, isDark } = useTheme()
  const fetchPrerequisites = useSetupStore((state) => state.fetchPrerequisites)
  const [state, dispatch] = useReducer(wizardReducer, entryMode, getInitialStateForMode)

  const handleDone = useCallback(() => {
    fetchPrerequisites()
    onComplete()
  }, [fetchPrerequisites, onComplete])

  const handleClose = useCallback(() => {
    fetchPrerequisites()
    onDismiss()
  }, [fetchPrerequisites, onDismiss])

  const canGoBack = entryMode === 'full' && ALL_STEPS.indexOf(state.currentStep) > 1 && !state.allConfigured

  function renderStep() {
    if (state.allConfigured) {
      return (
        <View style={styles.completedContainer}>
          <View style={[styles.completedIcon, { backgroundColor: colors.primary }]}>
            <Check color={colors.primaryText} size={32} strokeWidth={2.5} />
          </View>
          <Image
            source={isDark ? Assets.codexWhite : Assets.codexBlack}
            style={styles.completedLogo}
            resizeMode="contain"
          />
          <Text style={[styles.completedTitle, { color: colors.text }]}>OpenAI is ready!</Text>
          <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
            Your OpenAI account is authenticated in opencode.
          </Text>
        </View>
      )
    }

    switch (state.currentStep) {
      case 'detect':
        return <DetectStep dispatch={dispatch} />
      case 'authenticate':
        return <AuthenticateStep dispatch={dispatch} authSession={state.authSession} />
      case 'verify':
        return <VerifyStep dispatch={dispatch} />
      default:
        return null
    }
  }

  return (
    <SetupWizardScreen backgroundColor={colors.background} onClose={handleClose}>
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => dispatch({ type: 'GO_BACK' })} style={styles.headerButton}>
            <ChevronLeft color={colors.text} size={22} strokeWidth={2.25} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>OpenAI via opencode</Text>
        <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
          <X color={colors.textTertiary} size={20} strokeWidth={2.25} />
        </TouchableOpacity>
      </View>

      {state.currentStep !== 'detect' && !state.allConfigured ? (
        <WizardStepper currentStep={state.currentStep} stepStatuses={state.stepStatuses} />
      ) : null}

      <View style={styles.content}>{renderStep()}</View>

      {state.allConfigured ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: colors.primary }]}
            onPress={handleDone}
            activeOpacity={0.7}
          >
            <Text style={[styles.doneText, { color: colors.primaryText }]}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SetupWizardScreen>
  )
}

const styles = StyleSheet.create({
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
  headerTitle: { ...typeStyles.heading },
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
    marginBottom: spacing[1],
  },
  completedLogo: {
    width: 48,
    height: 48,
    marginBottom: spacing[1],
  },
  completedTitle: { ...typeStyles.heading },
  completedSubtitle: { ...typeStyles.body, textAlign: 'center' },
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
  doneText: { ...typeStyles.button },
})
