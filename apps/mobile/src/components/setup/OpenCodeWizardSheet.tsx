import React, { useCallback, useReducer } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, SafeAreaView } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useSetupStore } from '../../stores/setup'
import { Assets } from '../../../assets'
import { ChevronLeft, X, Check } from 'lucide-react-native'
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

interface Props {
  visible: boolean
  onClose: () => void
  onComplete: () => void
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

function getInitialState(): WizardState {
  const stepStatuses = {} as Record<OpenCodeWizardStep, OpenCodeWizardStepStatus>
  for (const step of ALL_STEPS) {
    stepStatuses[step] = step === 'detect' ? 'active' : 'pending'
  }

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

    default:
      return state
  }
}

export default function OpenCodeWizardSheet({ visible, onClose, onComplete }: Props) {
  const { colors, isDark } = useTheme()
  const fetchPrerequisites = useSetupStore((state) => state.fetchPrerequisites)
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)

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
          <Image source={isDark ? Assets.opencodeWhite : Assets.opencodeBlack} style={styles.completedLogo} resizeMode="contain" />
          <Text style={[styles.completedTitle, { color: colors.text }]}>OpenCode is ready!</Text>
          <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
            The runtime is installed and verified for later provider setup.
          </Text>
          {state.openCodeStatus?.version ? (
            <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>v{state.openCodeStatus.version}</Text>
          ) : null}
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
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    ...typographyScale.lg,
    fontWeight: '700',
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
    ...typographyScale.base,
    fontWeight: '600',
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
    ...typographyScale['2xl'],
    fontWeight: '700',
    textAlign: 'center',
  },
  completedSubtitle: {
    ...typographyScale.base,
    textAlign: 'center',
  },
  completedDetail: {
    ...typographyScale.sm,
  },
})
