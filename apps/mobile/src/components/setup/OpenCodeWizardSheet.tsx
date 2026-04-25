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
  OpenCodeSetupStatus,
  OpenCodeWizardStep,
  OpenCodeWizardStepStatus,
} from '@pocketdev/shared/types'
import WizardStepper from './opencode-wizard/WizardStepper'
import DetectStep from './opencode-wizard/DetectStep'
import ReviewStep from './opencode-wizard/ReviewStep'
import InstallStep from './opencode-wizard/InstallStep'
import VerifyStep from './opencode-wizard/VerifyStep'
import OpencodeSetupAnimation from '../animations/OpencodeSetupAnimation'
import { useWizardCompletion } from '../../hooks/useWizardCompletion'

interface Props {
  onDismiss: () => void
  onComplete: () => void
  entryMode?: 'full' | 'auth_repair'
}

const ALL_STEPS: OpenCodeWizardStep[] = ['detect', 'review', 'install', 'verify']

interface WizardState {
  currentStep: OpenCodeWizardStep
  stepStatuses: Record<OpenCodeWizardStep, OpenCodeWizardStepStatus>
  openCodeStatus: OpenCodeSetupStatus | null
  error: string | null
  allConfigured: boolean
}

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; openCodeStatus: OpenCodeSetupStatus }
  | { type: 'STEP_COMPLETE'; step: OpenCodeWizardStep; openCodeStatus?: OpenCodeSetupStatus | null }
  | { type: 'STEP_FAILED'; step: OpenCodeWizardStep; error: string }
  | { type: 'GO_BACK' }
  | { type: 'RETRY' }
  | { type: 'FORCE_REINSTALL' }

function getInitialStateForMode(entryMode: 'full' | 'auth_repair' = 'full'): WizardState {
  const stepStatuses = {} as Record<OpenCodeWizardStep, OpenCodeWizardStepStatus>
  for (const step of ALL_STEPS) {
    stepStatuses[step] = 'pending'
  }

  if (entryMode === 'auth_repair') {
    stepStatuses.detect = 'skipped'
    stepStatuses.review = 'skipped'
    stepStatuses.install = 'skipped'
    stepStatuses.verify = 'active'
    return {
      currentStep: 'verify',
      stepStatuses,
      openCodeStatus: null,
      error: null,
      allConfigured: false,
    }
  }

  stepStatuses.detect = 'active'
  return {
    currentStep: 'detect',
    stepStatuses,
    openCodeStatus: null,
    error: null,
    allConfigured: false,
  }
}

function findNextPending(statuses: Record<OpenCodeWizardStep, OpenCodeWizardStepStatus>, afterIndex: number): OpenCodeWizardStep | null {
  for (let i = afterIndex + 1; i < ALL_STEPS.length; i++) {
    if (statuses[ALL_STEPS[i]] === 'pending') return ALL_STEPS[i]
  }
  return null
}

function findPrevious(statuses: Record<OpenCodeWizardStep, OpenCodeWizardStepStatus>, beforeIndex: number): OpenCodeWizardStep | null {
  for (let i = beforeIndex - 1; i >= 1; i--) {
    const status = statuses[ALL_STEPS[i]]
    if (status === 'completed' || status === 'active') return ALL_STEPS[i]
  }
  return null
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'DETECTION_COMPLETE': {
      const nextStatuses = { ...state.stepStatuses }
      nextStatuses.detect = 'completed'
      if (action.openCodeStatus.installed) nextStatuses.install = 'skipped'
      if (action.openCodeStatus.installed && action.openCodeStatus.verified) nextStatuses.verify = 'skipped'

      const allSkipped = ALL_STEPS.slice(1).every((step) => nextStatuses[step] === 'skipped')
      if (allSkipped) {
        return {
          ...state,
          currentStep: 'detect',
          stepStatuses: nextStatuses,
          openCodeStatus: action.openCodeStatus,
          allConfigured: true,
        }
      }

      const firstPending = ALL_STEPS.find((step) => nextStatuses[step] === 'pending')
      if (firstPending) nextStatuses[firstPending] = 'active'

      return {
        ...state,
        currentStep: firstPending ?? 'detect',
        stepStatuses: nextStatuses,
        openCodeStatus: action.openCodeStatus,
      }
    }

    case 'STEP_COMPLETE': {
      const nextStatuses = { ...state.stepStatuses }
      nextStatuses[action.step] = 'completed'
      const next = findNextPending(nextStatuses, ALL_STEPS.indexOf(action.step))
      if (next) nextStatuses[next] = 'active'
      return {
        ...state,
        currentStep: next ?? action.step,
        stepStatuses: nextStatuses,
        openCodeStatus: action.openCodeStatus ?? state.openCodeStatus,
        error: null,
        allConfigured: !next,
      }
    }

    case 'STEP_FAILED': {
      const nextStatuses = { ...state.stepStatuses }
      nextStatuses[action.step] = 'failed'
      return { ...state, stepStatuses: nextStatuses, error: action.error }
    }

    case 'GO_BACK': {
      const previous = findPrevious(state.stepStatuses, ALL_STEPS.indexOf(state.currentStep))
      if (!previous) return state
      const nextStatuses = { ...state.stepStatuses }
      nextStatuses[state.currentStep] = 'pending'
      nextStatuses[previous] = 'active'
      return { ...state, currentStep: previous, stepStatuses: nextStatuses, error: null }
    }

    case 'RETRY': {
      const nextStatuses = { ...state.stepStatuses }
      nextStatuses[state.currentStep] = 'active'
      return { ...state, stepStatuses: nextStatuses, error: null }
    }

    case 'FORCE_REINSTALL': {
      const nextStatuses = { ...state.stepStatuses }
      nextStatuses['install'] = 'active'
      if (nextStatuses['verify'] === 'skipped') nextStatuses['verify'] = 'pending'
      return { ...state, currentStep: 'install', stepStatuses: nextStatuses, error: null, allConfigured: false }
    }

    default:
      return state
  }
}

export default function OpenCodeWizardSheet({ onDismiss, onComplete, entryMode = 'full' }: Props) {
  const { colors, isDark } = useTheme()
  const fetchPrerequisites = useSetupStore((state) => state.fetchPrerequisites)
  const markToolPending = useSetupStore((s) => s.markToolPending)
  const [state, dispatch] = useReducer(reducer, entryMode, getInitialStateForMode)
  const { animationDone, onAnimationComplete } = useWizardCompletion()

  const handleDone = useCallback(() => {
    markToolPending('opencode_cli')
    fetchPrerequisites()
    onComplete()
  }, [markToolPending, fetchPrerequisites, onComplete])

  const handleClose = useCallback(() => {
    markToolPending('opencode_cli')
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
          <Image source={isDark ? Assets.opencodeWhite : Assets.opencodeBlack} style={styles.completedLogo} resizeMode="contain" />
          <Text style={[styles.completedTitle, { color: colors.text }]}>OpenCode is ready!</Text>
          <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
            The runtime is installed and verified for later provider setup.
          </Text>
          {state.openCodeStatus?.version ? (
            <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>v{state.openCodeStatus.version}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.reinstallButton}
            onPress={() => dispatch({ type: 'FORCE_REINSTALL' })}
            activeOpacity={0.7}
          >
            <RotateCcw color={colors.textTertiary} size={14} strokeWidth={2.25} />
            <Text style={[styles.reinstallText, { color: colors.textTertiary }]}>Reinstall</Text>
          </TouchableOpacity>
        </View>
      )
    }

    switch (state.currentStep) {
      case 'detect':
        return <DetectStep dispatch={dispatch} />
      case 'review':
        return <ReviewStep openCodeStatus={state.openCodeStatus} dispatch={dispatch} />
      case 'install':
        return <InstallStep dispatch={dispatch} />
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>OpenCode</Text>
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
          <OpencodeSetupAnimation onComplete={onAnimationComplete} />
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
    ...typeStyles.bodySmall,
  },
  reinstallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  reinstallText: {
    ...typeStyles.meta,
  },
})
