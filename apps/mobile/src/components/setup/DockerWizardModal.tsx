import React, { useReducer, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useSetupStore } from '../../stores/setup'
import { Assets } from '../../../assets'
import { ChevronLeft, X, Check } from 'lucide-react-native'
import SetupWizardScreen from './SetupWizardScreen'
import WizardStepper from './docker-wizard/WizardStepper'
import DetectStep from './docker-wizard/DetectStep'
import InstallStep from './docker-wizard/InstallStep'
import StartDaemonStep from './docker-wizard/StartDaemonStep'
import UserGroupStep from './docker-wizard/UserGroupStep'
import VerifyStep from './docker-wizard/VerifyStep'
import type { DockerSetupStatus, DockerWizardStep, DockerWizardStepStatus } from '@pocketdev/shared/types'
import DockerSetupAnimation from '../animations/DockerSetupAnimation'
import { useWizardCompletion } from '../../hooks/useWizardCompletion'

interface Props {
  onDismiss: () => void
  onComplete: () => void
}

// ─── State machine ──────────────────────────────────────

const ALL_STEPS: DockerWizardStep[] = [
  'detect', 'install', 'start-daemon', 'add-user-group', 'verify',
]

interface WizardState {
  currentStep: DockerWizardStep
  stepStatuses: Record<DockerWizardStep, DockerWizardStepStatus>
  dockerStatus: DockerSetupStatus | null
  error: string | null
  allConfigured: boolean
}

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; dockerStatus: DockerSetupStatus }
  | { type: 'STEP_COMPLETE'; step: DockerWizardStep }
  | { type: 'STEP_FAILED'; step: DockerWizardStep; error: string }
  | { type: 'GO_BACK' }
  | { type: 'RETRY' }

function getInitialState(): WizardState {
  const stepStatuses = {} as Record<DockerWizardStep, DockerWizardStepStatus>
  for (const step of ALL_STEPS) {
    stepStatuses[step] = step === 'detect' ? 'active' : 'pending'
  }
  return {
    currentStep: 'detect',
    stepStatuses,
    dockerStatus: null,
    error: null,
    allConfigured: false,
  }
}

function findNextActiveStep(statuses: Record<DockerWizardStep, DockerWizardStepStatus>, afterIndex: number): DockerWizardStep | null {
  for (let i = afterIndex + 1; i < ALL_STEPS.length; i++) {
    if (statuses[ALL_STEPS[i]!] === 'pending') return ALL_STEPS[i]!
  }
  return null
}

function findPrevActiveStep(statuses: Record<DockerWizardStep, DockerWizardStepStatus>, beforeIndex: number): DockerWizardStep | null {
  for (let i = beforeIndex - 1; i >= 1; i--) { // skip detect (index 0)
    const s = statuses[ALL_STEPS[i]!]
    if (s === 'completed' || s === 'active') return ALL_STEPS[i]!
  }
  return null
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'DETECTION_COMPLETE': {
      const ds = action.dockerStatus
      const newStatuses = { ...state.stepStatuses }
      newStatuses['detect'] = 'completed'

      // Skip logic based on what's already configured
      if (ds.installed) newStatuses['install'] = 'skipped'
      if (ds.daemon_running) newStatuses['start-daemon'] = 'skipped'
      if (ds.user_in_docker_group) newStatuses['add-user-group'] = 'skipped'

      // If everything is configured, go to all-done
      const allSkipped = ALL_STEPS.slice(1).every((s) => newStatuses[s] === 'skipped')
      if (allSkipped) {
        return {
          ...state,
          currentStep: 'detect',
          stepStatuses: newStatuses,
          dockerStatus: ds,
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
        dockerStatus: ds,
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

export default function DockerWizardModal({ onDismiss, onComplete }: Props) {
  const { colors, isDark } = useTheme()
  const fetchPrerequisites = useSetupStore((s) => s.fetchPrerequisites)
  const markToolPending = useSetupStore((s) => s.markToolPending)
  const [state, dispatch] = useReducer(wizardReducer, undefined, getInitialState)
  const { animationDone, onAnimationComplete } = useWizardCompletion()

  const handleDone = useCallback(() => {
    markToolPending('docker')
    fetchPrerequisites()
    onComplete()
  }, [markToolPending, fetchPrerequisites, onComplete])

  const handleClose = useCallback(() => {
    markToolPending('docker')
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
          <Image
            source={isDark ? Assets.dockerWhite : Assets.dockerBlack}
            style={styles.completedLogo}
            resizeMode="contain"
          />
          <Text style={[styles.completedTitle, { color: colors.text }]}>Docker is ready!</Text>
          <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
            Docker Engine and Compose are installed and running on your server.
          </Text>
          {state.dockerStatus?.version && (
            <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>
              Docker v{state.dockerStatus.version}
            </Text>
          )}
          {state.dockerStatus?.compose_version && (
            <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>
              Compose v{state.dockerStatus.compose_version}
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
      case 'start-daemon':
        return <StartDaemonStep dispatch={dispatch} />
      case 'add-user-group':
        return <UserGroupStep dispatch={dispatch} />
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Docker Setup</Text>
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
        {state.allConfigured && animationDone && (
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

        {/* Completion animation — full-screen overlay inside modal, reveals completion UI as it fades out */}
        {state.allConfigured && !animationDone && (
          <DockerSetupAnimation onComplete={onAnimationComplete} />
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
