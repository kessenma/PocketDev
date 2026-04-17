import React, { useReducer, useCallback, useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useSetupStore } from '../../stores/setup'
import { Assets } from '../../../assets'
import { ChevronLeft, X, Check } from 'lucide-react-native'
import WizardStepper from './python-wizard/WizardStepper'
import DetectStep from './python-wizard/DetectStep'
import AddPpaStep from './python-wizard/AddPpaStep'
import InstallPythonStep from './python-wizard/InstallPythonStep'
import InstallVenvStep from './python-wizard/InstallVenvStep'
import InstallPipStep from './python-wizard/InstallPipStep'
import VerifyStep from './python-wizard/VerifyStep'
import type { PythonSetupStatus, PythonWizardStep, PythonWizardStepStatus } from '@pocketdev/shared/types'
import PythonSetupAnimation from '../animations/PythonSetupAnimation'
import SetupWizardScreen from './SetupWizardScreen'

interface Props {
  onDismiss: () => void
  onComplete: () => void
}

// ─── State machine ──────────────────────────────────────

const ALL_STEPS: PythonWizardStep[] = [
  'detect', 'add-ppa', 'install', 'install-venv', 'install-pip', 'verify',
]

interface WizardState {
  currentStep: PythonWizardStep
  stepStatuses: Record<PythonWizardStep, PythonWizardStepStatus>
  pythonStatus: PythonSetupStatus | null
  error: string | null
  allConfigured: boolean
}

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; pythonStatus: PythonSetupStatus }
  | { type: 'STEP_COMPLETE'; step: PythonWizardStep }
  | { type: 'STEP_FAILED'; step: PythonWizardStep; error: string }
  | { type: 'GO_BACK' }
  | { type: 'RETRY' }

function getInitialState(): WizardState {
  const stepStatuses = {} as Record<PythonWizardStep, PythonWizardStepStatus>
  for (const step of ALL_STEPS) {
    stepStatuses[step] = step === 'detect' ? 'active' : 'pending'
  }
  return {
    currentStep: 'detect',
    stepStatuses,
    pythonStatus: null,
    error: null,
    allConfigured: false,
  }
}

function findNextActiveStep(statuses: Record<PythonWizardStep, PythonWizardStepStatus>, afterIndex: number): PythonWizardStep | null {
  for (let i = afterIndex + 1; i < ALL_STEPS.length; i++) {
    if (statuses[ALL_STEPS[i]] === 'pending') return ALL_STEPS[i]
  }
  return null
}

function findPrevActiveStep(statuses: Record<PythonWizardStep, PythonWizardStepStatus>, beforeIndex: number): PythonWizardStep | null {
  for (let i = beforeIndex - 1; i >= 1; i--) { // skip detect (index 0)
    const s = statuses[ALL_STEPS[i]]
    if (s === 'completed' || s === 'active') return ALL_STEPS[i]
  }
  return null
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'DETECTION_COMPLETE': {
      const ps = action.pythonStatus
      const newStatuses = { ...state.stepStatuses }
      newStatuses['detect'] = 'completed'

      // Skip logic based on what's already installed
      if (ps.ppa_added) newStatuses['add-ppa'] = 'skipped'
      if (ps.installed) {
        // Python is already installed — skip PPA and install
        newStatuses['add-ppa'] = 'skipped'
        newStatuses['install'] = 'skipped'
      }
      if (ps.venv_available) newStatuses['install-venv'] = 'skipped'
      if (ps.pip_installed) newStatuses['install-pip'] = 'skipped'

      // If everything is configured, go to all-done
      const allSkipped = ALL_STEPS.slice(1).every((s) => newStatuses[s] === 'skipped')
      if (allSkipped) {
        return {
          ...state,
          currentStep: 'detect',
          stepStatuses: newStatuses,
          pythonStatus: ps,
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
        pythonStatus: ps,
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

export default function PythonWizardSheet({ onDismiss, onComplete }: Props) {
  const { colors, isDark } = useTheme()
  const fetchPrerequisites = useSetupStore((s) => s.fetchPrerequisites)
  const [state, dispatch] = useReducer(wizardReducer, undefined, getInitialState)
  const [completionAnimationDone, setCompletionAnimationDone] = useState(false)

  const handleDone = useCallback(() => {
    fetchPrerequisites()
    onComplete()
  }, [fetchPrerequisites, onComplete])

  const handleClose = useCallback(() => {
    fetchPrerequisites()
    onDismiss()
  }, [fetchPrerequisites, onDismiss])

  const currentIndex = ALL_STEPS.indexOf(state.currentStep)
  const hasPrevStep = currentIndex > 1 && ALL_STEPS.slice(1, currentIndex).some(
    (s) => state.stepStatuses[s] === 'completed' || state.stepStatuses[s] === 'active',
  )
  const canGoBack = hasPrevStep && !state.allConfigured

  function renderStep() {
    if (state.allConfigured) {
      if (!completionAnimationDone) {
        return <PythonSetupAnimation onComplete={() => setCompletionAnimationDone(true)} />
      }
      return (
        <View style={styles.completedContainer}>
          <View style={[styles.completedIcon, { backgroundColor: colors.primary }]}>
            <Check color={colors.primaryText} size={32} strokeWidth={2.5} />
          </View>
          <Image
            source={isDark ? Assets.pythonWhite : Assets.pythonBlack}
            style={styles.completedLogo}
            resizeMode="contain"
          />
          <Text style={[styles.completedTitle, { color: colors.text }]}>Python is ready!</Text>
          <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
            Python{state.pythonStatus?.version ? ` ${state.pythonStatus.version}` : ''} with pip and venv are installed on your server.
          </Text>
          {state.pythonStatus?.version && (
            <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>
              v{state.pythonStatus.version}
            </Text>
          )}
          {state.pythonStatus?.path && (
            <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>
              {state.pythonStatus.path}
            </Text>
          )}
        </View>
      )
    }

    switch (state.currentStep) {
      case 'detect':
        return <DetectStep dispatch={dispatch} />
      case 'add-ppa':
        return <AddPpaStep dispatch={dispatch} />
      case 'install':
        return <InstallPythonStep dispatch={dispatch} />
      case 'install-venv':
        return <InstallVenvStep dispatch={dispatch} pythonBin={state.pythonStatus?.binary ?? 'python3'} />
      case 'install-pip':
        return <InstallPipStep dispatch={dispatch} pythonBin={state.pythonStatus?.binary ?? 'python3'} />
      case 'verify':
        return <VerifyStep dispatch={dispatch} />
      default:
        return null
    }
  }

  return (
    <SetupWizardScreen backgroundColor={colors.background} onClose={handleClose}>
        {/* Header */}
        <View style={styles.header}>
          {canGoBack ? (
            <TouchableOpacity onPress={() => dispatch({ type: 'GO_BACK' })} style={styles.headerButton}>
              <ChevronLeft color={colors.text} size={22} strokeWidth={2.25} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>Python Setup</Text>
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
        {state.allConfigured && completionAnimationDone && (
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
  headerTitle: {
    ...typeStyles.heading,
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
    ...typeStyles.heading,
  },
  completedSubtitle: {
    ...typeStyles.body,
    textAlign: 'center',
  },
  completedDetail: {
    ...typeStyles.mono,
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
    ...typeStyles.button,
  },
})
