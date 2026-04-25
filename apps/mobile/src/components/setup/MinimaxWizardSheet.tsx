import React, { useCallback, useReducer } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useSetupStore } from '../../stores/setup'
import { Assets } from '../../../assets'
import { ChevronLeft, X, Check, RotateCcw } from 'lucide-react-native'
import SetupWizardScreen from './SetupWizardScreen'
import type {
  MinimaxSetupStatus,
  MinimaxWizardStep,
  MinimaxWizardStepStatus,
} from '@pocketdev/shared/types'
import WizardStepper from './minimax-wizard/WizardStepper'
import DetectStep from './minimax-wizard/DetectStep'
import ReviewStep from './minimax-wizard/ReviewStep'
import ConfigureStep from './minimax-wizard/ConfigureStep'
import VerifyStep from './minimax-wizard/VerifyStep'
import MinimaxSetupAnimation from '../animations/MinimaxSetupAnimation'
import { useWizardCompletion } from '../../hooks/useWizardCompletion'

interface Props {
  onDismiss: () => void
  onComplete: () => void
}

const ALL_STEPS: MinimaxWizardStep[] = ['detect', 'review', 'configure', 'verify']

interface WizardState {
  currentStep: MinimaxWizardStep
  stepStatuses: Record<MinimaxWizardStep, MinimaxWizardStepStatus>
  minimaxStatus: MinimaxSetupStatus | null
  error: string | null
  allConfigured: boolean
}

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; minimaxStatus: MinimaxSetupStatus }
  | { type: 'STEP_COMPLETE'; step: MinimaxWizardStep; minimaxStatus?: MinimaxSetupStatus | null }
  | { type: 'STEP_FAILED'; step: MinimaxWizardStep; error: string }
  | { type: 'GO_BACK' }
  | { type: 'RETRY' }
  | { type: 'FORCE_REINSTALL' }

function getInitialState(): WizardState {
  const stepStatuses = {} as Record<MinimaxWizardStep, MinimaxWizardStepStatus>
  for (const step of ALL_STEPS) {
    stepStatuses[step] = step === 'detect' ? 'active' : 'pending'
  }
  return { currentStep: 'detect', stepStatuses, minimaxStatus: null, error: null, allConfigured: false }
}

function findNextPending(statuses: Record<MinimaxWizardStep, MinimaxWizardStepStatus>, afterIndex: number): MinimaxWizardStep | null {
  for (let i = afterIndex + 1; i < ALL_STEPS.length; i++) {
    if (statuses[ALL_STEPS[i]] === 'pending') return ALL_STEPS[i]
  }
  return null
}

function findPrevious(statuses: Record<MinimaxWizardStep, MinimaxWizardStepStatus>, beforeIndex: number): MinimaxWizardStep | null {
  for (let i = beforeIndex - 1; i >= 1; i--) {
    const s = statuses[ALL_STEPS[i]]
    if (s === 'completed' || s === 'active') return ALL_STEPS[i]
  }
  return null
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'DETECTION_COMPLETE': {
      const s = action.minimaxStatus
      const next = { ...state.stepStatuses }
      next.detect = 'completed'

      if (s.api_key_configured && s.verified) {
        // Everything already done
        next.configure = 'skipped'
        next.verify = 'skipped'
        const allSkipped = ALL_STEPS.slice(1).every((step) => next[step] === 'skipped')
        if (allSkipped) {
          return { ...state, currentStep: 'detect', stepStatuses: next, minimaxStatus: s, allConfigured: true }
        }
      } else if (s.api_key_configured && !s.verified) {
        // Key exists but not yet verified — skip configure, go straight to verify
        next.configure = 'skipped'
      }

      const firstPending = ALL_STEPS.find((step) => next[step] === 'pending')
      if (firstPending) next[firstPending] = 'active'

      return { ...state, currentStep: firstPending ?? 'detect', stepStatuses: next, minimaxStatus: s }
    }

    case 'STEP_COMPLETE': {
      const next = { ...state.stepStatuses }
      next[action.step] = 'completed'
      const nextStep = findNextPending(next, ALL_STEPS.indexOf(action.step))
      if (nextStep) next[nextStep] = 'active'
      return {
        ...state,
        currentStep: nextStep ?? action.step,
        stepStatuses: next,
        minimaxStatus: action.minimaxStatus ?? state.minimaxStatus,
        error: null,
        allConfigured: !nextStep,
      }
    }

    case 'STEP_FAILED': {
      const next = { ...state.stepStatuses }
      next[action.step] = 'failed'
      return { ...state, stepStatuses: next, error: action.error }
    }

    case 'GO_BACK': {
      const prev = findPrevious(state.stepStatuses, ALL_STEPS.indexOf(state.currentStep))
      if (!prev) return state
      const next = { ...state.stepStatuses }
      next[state.currentStep] = 'pending'
      next[prev] = 'active'
      return { ...state, currentStep: prev, stepStatuses: next, error: null }
    }

    case 'RETRY': {
      const next = { ...state.stepStatuses }
      next[state.currentStep] = 'active'
      return { ...state, stepStatuses: next, error: null }
    }

    case 'FORCE_REINSTALL': {
      const next = { ...state.stepStatuses }
      next['configure'] = 'active'
      if (next['verify'] === 'skipped') next['verify'] = 'pending'
      return { ...state, currentStep: 'configure', stepStatuses: next, error: null, allConfigured: false }
    }

    default:
      return state
  }
}

export default function MinimaxWizardSheet({ onDismiss, onComplete }: Props) {
  const { colors, isDark } = useTheme()
  const fetchPrerequisites = useSetupStore((state) => state.fetchPrerequisites)
  const markToolPending = useSetupStore((state) => state.markToolPending)
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)
  const { animationDone, onAnimationComplete } = useWizardCompletion()

  const handleDone = useCallback(() => {
    markToolPending('minimax_provider')
    fetchPrerequisites()
    onComplete()
  }, [markToolPending, fetchPrerequisites, onComplete])

  const handleClose = useCallback(() => {
    markToolPending('minimax_provider')
    fetchPrerequisites()
    onDismiss()
  }, [markToolPending, fetchPrerequisites, onDismiss])

  const canGoBack = ALL_STEPS.indexOf(state.currentStep) > 1 && !state.allConfigured

  function renderStep() {
    if (state.allConfigured) {
      return (
        <View style={styles.completedContainer}>
          <View style={[styles.completedIcon, { backgroundColor: colors.primary }]}>
            <Check color={colors.primaryText} size={32} strokeWidth={2.5} />
          </View>
          <Image source={isDark ? Assets.minimaxWhite : Assets.minimaxBlack} style={styles.completedLogo} resizeMode="contain" />
          <Text style={[styles.completedTitle, { color: colors.text }]}>Minimax is ready!</Text>
          <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
            Your workspace is configured to use Minimax via OpenCode.
          </Text>
          {state.minimaxStatus?.api_key_masked ? (
            <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>
              {state.minimaxStatus.api_key_masked}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.reconfigureButton}
            onPress={() => dispatch({ type: 'FORCE_REINSTALL' })}
            activeOpacity={0.7}
          >
            <RotateCcw color={colors.textTertiary} size={14} strokeWidth={2.25} />
            <Text style={[styles.reconfigureText, { color: colors.textTertiary }]}>Re-configure</Text>
          </TouchableOpacity>
        </View>
      )
    }

    switch (state.currentStep) {
      case 'detect':
        return <DetectStep dispatch={dispatch} />
      case 'review':
        return <ReviewStep minimaxStatus={state.minimaxStatus} dispatch={dispatch} onClose={handleClose} />
      case 'configure':
        return <ConfigureStep dispatch={dispatch} />
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Minimax</Text>
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
          <MinimaxSetupAnimation onComplete={onAnimationComplete} />
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
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typeStyles.heading,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  footer: {
    padding: spacing[4],
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  doneText: {
    ...typeStyles.button,
  },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
  },
  completedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedLogo: {
    width: 44,
    height: 44,
  },
  completedTitle: {
    ...typeStyles.heading,
    textAlign: 'center',
  },
  completedSubtitle: {
    ...typeStyles.body,
    textAlign: 'center',
  },
  completedDetail: {
    ...typeStyles.mono,
  },
  reconfigureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  reconfigureText: {
    ...typeStyles.meta,
  },
})
