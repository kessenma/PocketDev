import React, { useReducer, useCallback } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, SafeAreaView } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useSetupStore } from '../../stores/setup'
import { Assets } from '../../../assets'
import { ChevronLeft, X, Check } from 'lucide-react-native'
import WizardStepper from './pkg-wizard/WizardStepper'
import DetectStep from './pkg-wizard/DetectStep'
import ReviewStep from './pkg-wizard/ReviewStep'
import InstallStep from './pkg-wizard/InstallStep'
import VerifyStep from './pkg-wizard/VerifyStep'
import type { PkgInstallTool, PkgManagerStatus, PkgWizardStep, PkgWizardStepStatus } from '@pocketdev/shared/types'
import { getDefaultSelectedTools } from './pkg-wizard/model'

interface Props {
  visible: boolean
  onClose: () => void
  onComplete: () => void
}

// ─── State machine ──────────────────────────────────────

const ALL_STEPS: PkgWizardStep[] = ['detect', 'review', 'install', 'verify']

interface WizardState {
  currentStep: PkgWizardStep
  stepStatuses: Record<PkgWizardStep, PkgWizardStepStatus>
  pkgStatus: PkgManagerStatus | null
  selectedTools: PkgInstallTool[]
  error: string | null
  allConfigured: boolean
}

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; pkgStatus: PkgManagerStatus }
  | { type: 'STEP_COMPLETE'; step: PkgWizardStep }
  | { type: 'STEP_FAILED'; step: PkgWizardStep; error: string }
  | { type: 'TOGGLE_TOOL'; tool: PkgInstallTool }
  | { type: 'GO_BACK' }
  | { type: 'RETRY' }

function getInitialState(): WizardState {
  const stepStatuses = {} as Record<PkgWizardStep, PkgWizardStepStatus>
  for (const step of ALL_STEPS) {
    stepStatuses[step] = step === 'detect' ? 'active' : 'pending'
  }
  return {
    currentStep: 'detect',
    stepStatuses,
    pkgStatus: null,
    selectedTools: [],
    error: null,
    allConfigured: false,
  }
}

function findNextActiveStep(statuses: Record<PkgWizardStep, PkgWizardStepStatus>, afterIndex: number): PkgWizardStep | null {
  for (let i = afterIndex + 1; i < ALL_STEPS.length; i++) {
    if (statuses[ALL_STEPS[i]] === 'pending') return ALL_STEPS[i]
  }
  return null
}

function findPrevActiveStep(statuses: Record<PkgWizardStep, PkgWizardStepStatus>, beforeIndex: number): PkgWizardStep | null {
  for (let i = beforeIndex - 1; i >= 1; i--) { // skip detect (index 0)
    const s = statuses[ALL_STEPS[i]]
    if (s === 'completed' || s === 'active') return ALL_STEPS[i]
  }
  return null
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'DETECTION_COMPLETE': {
      const ps = action.pkgStatus
      const newStatuses = { ...state.stepStatuses }
      newStatuses['detect'] = 'completed'
      newStatuses['review'] = 'active'

      return {
        ...state,
        currentStep: 'review',
        stepStatuses: newStatuses,
        pkgStatus: ps,
        selectedTools: getDefaultSelectedTools(ps),
        allConfigured: false,
      }
    }

    case 'STEP_COMPLETE': {
      const newStatuses = { ...state.stepStatuses }
      newStatuses[action.step] = 'completed'

      if (action.step === 'review' && state.selectedTools.length === 0) {
        newStatuses['install'] = 'skipped'
        newStatuses['verify'] = 'skipped'
        return {
          ...state,
          currentStep: 'review',
          stepStatuses: newStatuses,
          error: null,
          allConfigured: true,
        }
      }

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

    case 'TOGGLE_TOOL': {
      const selectedTools = state.selectedTools.includes(action.tool)
        ? state.selectedTools.filter((tool) => tool !== action.tool)
        : [...state.selectedTools, action.tool]

      return { ...state, selectedTools, allConfigured: false }
    }

    case 'GO_BACK': {
      const currentIndex = ALL_STEPS.indexOf(state.currentStep)
      const prev = findPrevActiveStep(state.stepStatuses, currentIndex)
      if (!prev) return state

      const newStatuses = { ...state.stepStatuses }
      newStatuses[state.currentStep] = 'pending'
      newStatuses[prev] = 'active'

      return { ...state, currentStep: prev, stepStatuses: newStatuses, error: null, allConfigured: false }
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

export default function PackageManagerWizardSheet({ visible, onClose, onComplete }: Props) {
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
          <View style={styles.completedLogos}>
            <Image source={isDark ? Assets.npmWhite : Assets.npmBlack} style={styles.completedLogo} resizeMode="contain" />
            <Image source={isDark ? Assets.pnpmWhite : Assets.pnpmBlack} style={styles.completedLogo} resizeMode="contain" />
            <Image source={isDark ? Assets.bunWhite : Assets.bunBlack} style={styles.completedLogo} resizeMode="contain" />
          </View>
          <Text style={[styles.completedTitle, { color: colors.text }]}>Server package tools are ready!</Text>
          <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
            Node.js, npm, pnpm, and Bun are available across the server.
          </Text>
          {state.pkgStatus && (
            <View style={styles.completedVersions}>
              {state.pkgStatus.npm.version && (
                <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>npm v{state.pkgStatus.npm.version}</Text>
              )}
              {state.pkgStatus.pnpm.version && (
                <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>pnpm v{state.pkgStatus.pnpm.version}</Text>
              )}
              {state.pkgStatus.bun.version && (
                <Text style={[styles.completedDetail, { color: colors.textTertiary }]}>bun v{state.pkgStatus.bun.version}</Text>
              )}
            </View>
          )}
        </View>
      )
    }

    switch (state.currentStep) {
      case 'detect':
        return <DetectStep dispatch={dispatch} />
      case 'review':
        return <ReviewStep pkgStatus={state.pkgStatus!} selectedTools={state.selectedTools} dispatch={dispatch} />
      case 'install':
        return <InstallStep pkgStatus={state.pkgStatus!} selectedTools={state.selectedTools} dispatch={dispatch} />
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Package Managers</Text>
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
  completedLogos: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[1],
  },
  completedLogo: {
    width: 36,
    height: 36,
  },
  completedTitle: {
    ...typographyScale['2xl'],
    fontWeight: '700',
  },
  completedSubtitle: {
    ...typographyScale.base,
    textAlign: 'center',
  },
  completedVersions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
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
