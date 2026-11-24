import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { ChevronLeft, RefreshCw, X } from 'lucide-react-native'
import type { AppleSetupStatus } from '@pocketdev/shared/types'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useSetupStore } from '../../stores/setup'
import { useConnectionStore } from '../../stores/connection'
import { fetchAppleSetupStatus } from '../../services/api'
import SetupWizardScreen from './SetupWizardScreen'
import AppleWizardStepper from './apple-wizard/AppleWizardStepper'
import XcodeStep from './apple-wizard/XcodeStep'
import AscStep from './apple-wizard/AscStep'
import AccountStep from './apple-wizard/AccountStep'
import VerifyStep from './apple-wizard/VerifyStep'
import { APPLE_WIZARD_STEPS, getFirstAppleStep, type AppleWizardStep } from './apple-wizard/apple-setup-utils'

interface Props {
  onDismiss: () => void
  onComplete: () => void
}

export default function AppleWizardModal({ onDismiss, onComplete }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const fetchPrerequisites = useSetupStore((s) => s.fetchPrerequisites)
  const markToolPending = useSetupStore((s) => s.markToolPending)

  const [status, setStatus] = useState<AppleSetupStatus | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [step, setStep] = useState<AppleWizardStep>('xcode')
  // Steps stay mounted once visited so a running download keeps its terminal.
  const [visited, setVisited] = useState<AppleWizardStep[]>([])
  const [verified, setVerified] = useState(false)

  const goTo = useCallback((next: AppleWizardStep) => {
    setStep(next)
    setVisited((prev) => (prev.includes(next) ? prev : [...prev, next]))
  }, [])

  const load = useCallback(async () => {
    if (!server) {
      setLoadError('Not connected to a server.')
      return
    }
    setLoadError(null)
    try {
      const next = await fetchAppleSetupStatus(server.ip, server.port)
      setStatus(next)
      goTo(getFirstAppleStep(next))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not check this Mac.')
    }
  }, [server, goTo])

  useEffect(() => {
    load()
  }, [load])

  const refreshSetupStore = useCallback(() => {
    markToolPending('xcode')
    markToolPending('asc_cli')
    fetchPrerequisites()
  }, [markToolPending, fetchPrerequisites])

  const handleClose = useCallback(() => {
    refreshSetupStore()
    onDismiss()
  }, [refreshSetupStore, onDismiss])

  const handleDone = useCallback(() => {
    refreshSetupStore()
    onComplete()
  }, [refreshSetupStore, onComplete])

  const stepIndex = APPLE_WIZARD_STEPS.findIndex((s) => s.key === step)
  const canGoBack = !!status?.supported && stepIndex > 0
  const next = APPLE_WIZARD_STEPS[stepIndex + 1]?.key
  const handleContinue = useCallback(() => {
    if (next) goTo(next)
  }, [next, goTo])

  function renderStep(key: AppleWizardStep, s: AppleSetupStatus) {
    const props = { status: s, onStatus: setStatus, onContinue: handleContinue }
    switch (key) {
      case 'xcode':
        return <XcodeStep {...props} />
      case 'asc':
        return <AscStep {...props} />
      case 'account':
        return <AccountStep {...props} />
      case 'verify':
        return <VerifyStep {...props} onVerified={() => setVerified(true)} />
    }
  }

  function renderBody() {
    if (loadError) {
      return (
        <View style={styles.center}>
          <Text style={[styles.centerText, { color: colors.textSecondary }]}>{loadError}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: colors.border }]}
            onPress={load}
            activeOpacity={0.7}
          >
            <RefreshCw color={colors.text} size={16} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.text }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      )
    }
    if (!status) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.centerText, { color: colors.textSecondary }]}>Checking this Mac…</Text>
        </View>
      )
    }
    if (!status.supported) {
      return (
        <View style={styles.center}>
          <Text style={[styles.centerText, { color: colors.textSecondary }]}>
            App Store tools need a Mac. This workspace isn’t running on macOS.
          </Text>
        </View>
      )
    }
    return visited.map((key) => (
      <View key={key} style={[styles.stepPane, key !== step && styles.hidden]}>
        {renderStep(key, status)}
      </View>
    ))
  }

  return (
    <SetupWizardScreen backgroundColor={colors.background} onClose={handleClose}>
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => goTo(APPLE_WIZARD_STEPS[stepIndex - 1].key)} style={styles.headerButton}>
            <ChevronLeft color={colors.text} size={22} strokeWidth={2.25} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>App Store Setup</Text>
        <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
          <X color={colors.textTertiary} size={20} strokeWidth={2.25} />
        </TouchableOpacity>
      </View>

      {status?.supported && (
        <AppleWizardStepper currentStep={step} status={status} verified={verified} onSelect={goTo} />
      )}

      <View style={styles.content}>{renderBody()}</View>

      {verified && step === 'verify' && (
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
  stepPane: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[6],
  },
  centerText: {
    ...typeStyles.body,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  buttonText: {
    ...typeStyles.button,
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
