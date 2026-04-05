import React, { useReducer, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, SafeAreaView } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useSetupStore } from '../../stores/setup'
import { Assets } from '../../../assets'
import { ChevronLeft, X, Check } from 'lucide-react-native'
import WizardStepper from './copilot-wizard/WizardStepper'
import DetectStep from './copilot-wizard/DetectStep'
import InstallStep from './copilot-wizard/InstallStep'
import AuthenticateStep from './copilot-wizard/AuthenticateStep'
import TrustStep from './copilot-wizard/TrustStep'
import VerifyStep from './copilot-wizard/VerifyStep'
import type {
  CopilotSetupStatus,
  CopilotTrustSessionStatus,
  CopilotWizardStep,
  CopilotWizardStepStatus,
  GitHubCliAuthSessionStatus,
} from '@pocketdev/shared/types'

interface Props {
  visible: boolean
  onClose: () => void
  onComplete: () => void
}

const ALL_STEPS: CopilotWizardStep[] = ['detect', 'install', 'authenticate', 'trust', 'verify']

interface WizardState {
  currentStep: CopilotWizardStep
  stepStatuses: Record<CopilotWizardStep, CopilotWizardStepStatus>
  copilotStatus: CopilotSetupStatus | null
  authSession: GitHubCliAuthSessionStatus | null
  trustSession: CopilotTrustSessionStatus | null
  error: string | null
  allConfigured: boolean
}

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; copilotStatus: CopilotSetupStatus }
  | {
    type: 'STEP_COMPLETE'
    step: CopilotWizardStep
    copilotStatus?: CopilotSetupStatus | null
    authSession?: GitHubCliAuthSessionStatus | null
    trustSession?: CopilotTrustSessionStatus | null
  }
  | { type: 'STEP_FAILED'; step: CopilotWizardStep; error: string }
  | { type: 'SET_AUTH_SESSION'; authSession: GitHubCliAuthSessionStatus | null }
  | { type: 'SET_TRUST_SESSION'; trustSession: CopilotTrustSessionStatus | null }
  | { type: 'GO_BACK' }

function getInitialState(): WizardState {
  const stepStatuses = {} as Record<CopilotWizardStep, CopilotWizardStepStatus>
  for (const step of ALL_STEPS) {
    stepStatuses[step] = step === 'detect' ? 'active' : 'pending'
  }
  return {
    currentStep: 'detect',
    stepStatuses,
    copilotStatus: null,
    authSession: null,
    trustSession: null,
    error: null,
    allConfigured: false,
  }
}

function findNextActiveStep(statuses: Record<CopilotWizardStep, CopilotWizardStepStatus>, afterIndex: number): CopilotWizardStep | null {
  for (let i = afterIndex + 1; i < ALL_STEPS.length; i++) {
    if (statuses[ALL_STEPS[i]] === 'pending') return ALL_STEPS[i]
  }
  return null
}

function findPrevActiveStep(statuses: Record<CopilotWizardStep, CopilotWizardStepStatus>, beforeIndex: number): CopilotWizardStep | null {
  for (let i = beforeIndex - 1; i >= 1; i--) {
    const status = statuses[ALL_STEPS[i]]
    if (status === 'completed' || status === 'active') return ALL_STEPS[i]
  }
  return null
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'DETECTION_COMPLETE': {
      const copilotStatus = action.copilotStatus
      const newStatuses = { ...state.stepStatuses }
      newStatuses.detect = 'completed'

      if (copilotStatus.installed && copilotStatus.tmux_installed) newStatuses.install = 'skipped'
      if (copilotStatus.authenticated) newStatuses.authenticate = 'skipped'
      if (copilotStatus.trust_configured) newStatuses.trust = 'skipped'
      if (copilotStatus.installed && copilotStatus.tmux_installed && copilotStatus.authenticated && copilotStatus.trust_configured) {
        newStatuses.verify = 'skipped'
      }

      const allSkipped = ALL_STEPS.slice(1).every((step) => newStatuses[step] === 'skipped')
      if (allSkipped) {
        return {
          ...state,
          currentStep: 'detect',
          stepStatuses: newStatuses,
          copilotStatus,
          allConfigured: true,
        }
      }

      const firstPending = ALL_STEPS.find((step) => newStatuses[step] === 'pending')
      if (firstPending) newStatuses[firstPending] = 'active'

      return {
        ...state,
        currentStep: firstPending ?? 'detect',
        stepStatuses: newStatuses,
        copilotStatus,
      }
    }

    case 'STEP_COMPLETE': {
      const newStatuses = { ...state.stepStatuses }
      newStatuses[action.step] = 'completed'

      const currentIndex = ALL_STEPS.indexOf(action.step)
      const next = findNextActiveStep(newStatuses, currentIndex)
      if (next) newStatuses[next] = 'active'

      return {
        ...state,
        currentStep: next ?? action.step,
        stepStatuses: newStatuses,
        copilotStatus: action.copilotStatus ?? state.copilotStatus,
        authSession: action.authSession ?? state.authSession,
        trustSession: action.trustSession ?? state.trustSession,
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

    case 'SET_TRUST_SESSION':
      return { ...state, trustSession: action.trustSession }

    case 'GO_BACK': {
      const currentIndex = ALL_STEPS.indexOf(state.currentStep)
      const previous = findPrevActiveStep(state.stepStatuses, currentIndex)
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

export default function CopilotWizardSheet({ visible, onClose, onComplete }: Props) {
  const { colors, isDark } = useTheme()
  const fetchPrerequisites = useSetupStore((state) => state.fetchPrerequisites)
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
            source={isDark ? Assets.githubCopilotWhite : Assets.githubCopilotBlack}
            style={styles.completedLogo}
            resizeMode="contain"
          />
          <Text style={[styles.completedTitle, { color: colors.text }]}>GitHub Copilot is ready!</Text>
          <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
            Your paired workspace can now launch Copilot with tmux, GitHub auth, and trusted folder access.
          </Text>
          {state.copilotStatus?.version ? (
            <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>
              v{state.copilotStatus.version}
            </Text>
          ) : null}
        </View>
      )
    }

    switch (state.currentStep) {
      case 'detect':
        return <DetectStep dispatch={dispatch} />
      case 'install':
        return <InstallStep dispatch={dispatch} />
      case 'authenticate':
        return <AuthenticateStep dispatch={dispatch} authSession={state.authSession} />
      case 'trust':
        return <TrustStep dispatch={dispatch} trustSession={state.trustSession} />
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>GitHub Copilot</Text>
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
  container: {
    flex: 1,
  },
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
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  doneButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  doneText: {
    ...typographyScale.base,
    fontWeight: '700',
  },
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
