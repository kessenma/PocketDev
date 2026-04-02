import React, { useReducer, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, SafeAreaView } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useSetupStore } from '../../stores/setup'
import { Assets } from '../../../assets'
import { ChevronLeft, X, Check } from 'lucide-react-native'
import WizardStepper from './codex-wizard/WizardStepper'
import DetectStep from './codex-wizard/DetectStep'
import InstallStep from './codex-wizard/InstallStep'
import AuthenticateStep from './codex-wizard/AuthenticateStep'
import VerifyStep from './codex-wizard/VerifyStep'
import type { CodexSetupStatus, CodexWizardStep, CodexWizardStepStatus } from '@pocketdev/shared/types'

interface Props {
  visible: boolean
  onClose: () => void
  onComplete: () => void
}

// ─── State machine ──────────────────────────────────────

const ALL_STEPS: CodexWizardStep[] = ['detect', 'install', 'authenticate', 'verify']

interface WizardState {
  currentStep: CodexWizardStep
  stepStatuses: Record<CodexWizardStep, CodexWizardStepStatus>
  codexStatus: CodexSetupStatus | null
  error: string | null
  allConfigured: boolean
}

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; codexStatus: CodexSetupStatus }
  | { type: 'STEP_COMPLETE'; step: CodexWizardStep }
  | { type: 'STEP_FAILED'; step: CodexWizardStep; error: string }
  | { type: 'GO_BACK' }
  | { type: 'RETRY' }

function getInitialState(): WizardState {
  const stepStatuses = {} as Record<CodexWizardStep, CodexWizardStepStatus>
  for (const step of ALL_STEPS) {
    stepStatuses[step] = step === 'detect' ? 'active' : 'pending'
  }
  return {
    currentStep: 'detect',
    stepStatuses,
    codexStatus: null,
    error: null,
    allConfigured: false,
  }
}

function findNextActiveStep(statuses: Record<CodexWizardStep, CodexWizardStepStatus>, afterIndex: number): CodexWizardStep | null {
  for (let i = afterIndex + 1; i < ALL_STEPS.length; i++) {
    if (statuses[ALL_STEPS[i]] === 'pending') return ALL_STEPS[i]
  }
  return null
}

function findPrevActiveStep(statuses: Record<CodexWizardStep, CodexWizardStepStatus>, beforeIndex: number): CodexWizardStep | null {
  for (let i = beforeIndex - 1; i >= 1; i--) { // skip detect (index 0)
    const s = statuses[ALL_STEPS[i]]
    if (s === 'completed' || s === 'active') return ALL_STEPS[i]
  }
  return null
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'DETECTION_COMPLETE': {
      const cs = action.codexStatus
      const newStatuses = { ...state.stepStatuses }
      newStatuses['detect'] = 'completed'

      // Skip logic
      if (cs.installed) newStatuses['install'] = 'skipped'
      if (cs.authenticated) {
        newStatuses['authenticate'] = 'skipped'
        newStatuses['verify'] = 'skipped'
      }

      // Check if everything is already configured
      const allSkipped = ALL_STEPS.slice(1).every((s) => newStatuses[s] === 'skipped')
      if (allSkipped) {
        return {
          ...state,
          currentStep: 'detect',
          stepStatuses: newStatuses,
          codexStatus: cs,
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
        codexStatus: cs,
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

export default function CodexWizardSheet({ visible, onClose, onComplete }: Props) {
  const { colors, isDark } = useTheme()
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
          <Image
            source={isDark ? Assets.codexWhite : Assets.codexBlack}
            style={styles.completedLogo}
            resizeMode="contain"
          />
          <Text style={[styles.completedTitle, { color: colors.text }]}>Codex CLI is ready!</Text>
          <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
            Your server is authenticated and ready to run Codex.
          </Text>
          {state.codexStatus?.version && (
            <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>
              v{state.codexStatus.version}
            </Text>
          )}
        </View>
      )
    }

    switch (state.currentStep) {
      case 'detect':
        return <DetectStep dispatch={dispatch} />
      case 'install':
        return <InstallStep dispatch={dispatch} />
      case 'authenticate':
        return <AuthenticateStep dispatch={dispatch} />
      case 'verify':
        return <VerifyStep dispatch={dispatch} />
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Codex Setup</Text>
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
    marginBottom: spacing[1],
  },
  completedLogo: {
    width: 48,
    height: 48,
    marginBottom: spacing[1],
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
