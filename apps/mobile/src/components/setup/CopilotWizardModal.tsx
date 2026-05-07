import React, { useReducer, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useSetupStore } from '../../stores/setup'
import { Assets } from '../../../assets'
import { ChevronLeft, X, Check } from 'lucide-react-native'
import SetupWizardScreen from './SetupWizardScreen'
import WizardStepper from './copilot-wizard/WizardStepper'
import DetectStep from './copilot-wizard/DetectStep'
import AuthenticateStep from './copilot-wizard/AuthenticateStep'
import VerifyStep from './copilot-wizard/VerifyStep'
import type {
  OpenCodeProviderAuthStatus,
  CopilotOpenCodeAuthSessionStatus,
  CopilotWizardStep,
  CopilotWizardStepStatus,
} from '@pocketdev/shared/types'
import CopilotSetupAnimation from '../animations/CopilotSetupAnimation'
import { useWizardCompletion } from '../../hooks/useWizardCompletion'

interface Props {
  onDismiss: () => void
  onComplete: () => void
  entryMode?: 'full' | 'auth_repair'
}

const ALL_STEPS: CopilotWizardStep[] = ['detect', 'authenticate', 'verify']

interface WizardState {
  currentStep: CopilotWizardStep
  stepStatuses: Record<CopilotWizardStep, CopilotWizardStepStatus>
  providerStatus: OpenCodeProviderAuthStatus | null
  authSession: CopilotOpenCodeAuthSessionStatus | null
  error: string | null
  allConfigured: boolean
}

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; providerStatus: OpenCodeProviderAuthStatus }
  | { type: 'STEP_COMPLETE'; step: CopilotWizardStep }
  | { type: 'STEP_FAILED'; step: CopilotWizardStep; error: string }
  | { type: 'SET_AUTH_SESSION'; authSession: CopilotOpenCodeAuthSessionStatus | null }
  | { type: 'GO_BACK' }

function getInitialStateForMode(entryMode: 'full' | 'auth_repair' = 'full'): WizardState {
  const stepStatuses = {} as Record<CopilotWizardStep, CopilotWizardStepStatus>
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

function findNextPendingStep(statuses: Record<CopilotWizardStep, CopilotWizardStepStatus>, afterIndex: number): CopilotWizardStep | null {
  for (let i = afterIndex + 1; i < ALL_STEPS.length; i++) {
    if (statuses[ALL_STEPS[i]] === 'pending') return ALL_STEPS[i]
  }
  return null
}

function findPrevStep(statuses: Record<CopilotWizardStep, CopilotWizardStepStatus>, beforeIndex: number): CopilotWizardStep | null {
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

    case 'SET_AUTH_SESSION':
      return { ...state, authSession: action.authSession }

    case 'GO_BACK': {
      const currentIndex = ALL_STEPS.indexOf(state.currentStep)
      const previous = findPrevStep(state.stepStatuses, currentIndex)
      if (!previous) return state

      const newStatuses = { ...state.stepStatuses }
      newStatuses[state.currentStep] = 'pending'
      newStatuses[previous] = 'active'

      return { ...state, currentStep: previous, stepStatuses: newStatuses, error: null }
    }

    default:
      return state
  }
}

export default function CopilotWizardModal({ onDismiss, onComplete, entryMode = 'full' }: Props) {
  const { colors, isDark } = useTheme()
  const fetchPrerequisites = useSetupStore((state) => state.fetchPrerequisites)
  const markToolPending = useSetupStore((s) => s.markToolPending)
  const [state, dispatch] = useReducer(wizardReducer, entryMode, getInitialStateForMode)
  const { animationDone, onAnimationComplete } = useWizardCompletion()

  const handleDone = useCallback(() => {
    markToolPending('copilot_cli')
    fetchPrerequisites()
    onComplete()
  }, [markToolPending, fetchPrerequisites, onComplete])

  const handleClose = useCallback(() => {
    markToolPending('copilot_cli')
    fetchPrerequisites()
    onDismiss()
  }, [markToolPending, fetchPrerequisites, onDismiss])

  const minBackIndex = entryMode === 'auth_repair' ? 2 : 1
  const canGoBack = ALL_STEPS.indexOf(state.currentStep) > minBackIndex && !state.allConfigured

  function renderStep() {
    if (state.allConfigured) {
      return (
        <View style={styles.completedContainer}>
          <View style={[styles.completedIcon, { backgroundColor: colors.primary }]}>
            <Check color={colors.primaryText} size={32} strokeWidth={2.5} />
          </View>
          <Image
            source={isDark ? Assets.githubCopilotWhite : Assets.githubCopilotBlack}
            style={styles.completedLogo}
            resizeMode="contain"
          />
          <Text style={[styles.completedTitle, { color: colors.text }]}>GitHub Copilot is ready!</Text>
          <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
            Your GitHub Copilot account is authenticated in opencode.
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>GitHub Copilot via opencode</Text>
        <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
          <X color={colors.textTertiary} size={20} strokeWidth={2.25} />
        </TouchableOpacity>
      </View>

      {state.currentStep !== 'detect' && !state.allConfigured ? (
        <WizardStepper currentStep={state.currentStep} stepStatuses={state.stepStatuses} />
      ) : null}

      <View style={styles.content}>{renderStep()}</View>

      {state.allConfigured && animationDone ? (
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

      {/* Completion animation — full-screen overlay inside modal, reveals completion UI as it fades out */}
      {state.allConfigured && !animationDone ? (
        <CopilotSetupAnimation onComplete={onAnimationComplete} />
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
    paddingVertical: spacing[3],
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
    paddingBottom: spacing[4],
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  doneButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  doneText: { ...typeStyles.button },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  completedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedLogo: { width: 44, height: 44 },
  completedTitle: { ...typeStyles.heading, textAlign: 'center' },
  completedSubtitle: { ...typeStyles.body, textAlign: 'center' },
})
