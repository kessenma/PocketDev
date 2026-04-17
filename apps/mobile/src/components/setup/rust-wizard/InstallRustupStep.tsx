import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import { useConnectionStore } from '../../../stores/connection'
import { postVerifyRust } from '../../../services/api'
import SudoPrompt from '../SudoPrompt'
import { Assets } from '../../../../assets'
import { AlertTriangle, ArrowRight, Download, RefreshCw } from 'lucide-react-native'
import SetupCommandCard from '../shared/SetupCommandCard'
import SetupProgressCard from '../shared/SetupProgressCard'
import SetupTerminalPanel from '../shared/SetupTerminalPanel'
import { playInstallSuccessHaptic } from '../shared/haptics'

const INSTALL_CMD = "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
const SOURCE_CMD = '( [ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env" ) || true'
const DONE_MARKER = '__RUSTUP_DONE__'
const FAIL_MARKER = '__RUSTUP_FAILED__'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'install-rustup' }
  | { type: 'STEP_FAILED'; step: 'install-rustup'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

type InstallState = 'idle' | 'installing' | 'verifying' | 'success' | 'install-failed' | 'verify-failed'

export default function InstallRustupStep({ dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [installState, setInstallState] = useState<InstallState>('idle')
  const [showOutput, setShowOutput] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (installState === 'success') {
      playInstallSuccessHaptic()
    }
  }, [installState])

  const {
    output, showSudoPrompt,
    sendCommand, submitSudoPassword, cancelSudoPrompt,
  } = useTerminalCommand({
    persistent: true,
    // No errorPatterns here — we detect success/failure in onOutput
    // to avoid matching the echoed command text
    onOutput: (chunk) => {
      // Filter out chunks that are just the echoed command
      if (chunk.includes('echo')) return

      if (chunk.includes(DONE_MARKER)) {
        verifyAfterInstall()
      } else if (chunk.includes(FAIL_MARKER)) {
        setInstallState('install-failed')
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    },
  })

  async function verifyAfterInstall() {
    if (!server) return
    setInstallState('verifying')
    try {
      const result = await postVerifyRust(server.ip, server.port)
      if (result.installed && result.cargo_installed) {
        setInstallState('success')
      } else {
        const missing: string[] = []
        if (!result.installed) missing.push('rustc')
        if (!result.cargo_installed) missing.push('cargo')
        setVerifyError(`Installed but not detected: ${missing.join(', ')}. The agent may need a PATH refresh.`)
        setInstallState('verify-failed')
      }
    } catch {
      setVerifyError('Could not verify installation with the agent.')
      setInstallState('verify-failed')
    }
  }

  function handleStart() {
    setInstallState('installing')
    setVerifyError(null)
    const fullCmd = `cd / && ( ${INSTALL_CMD} && ${SOURCE_CMD} ) && echo ${DONE_MARKER} || echo ${FAIL_MARKER}`
    sendCommand(fullCmd)
  }

  function handleContinue() {
    dispatch({ type: 'STEP_COMPLETE', step: 'install-rustup' })
  }

  function handleRetry() {
    setInstallState('idle')
    setVerifyError(null)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.iconRow}>
        <Image
          source={isDark ? Assets.rustWhite : Assets.rustBlack}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Install Rust</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Install Rust via rustup, the official Rust toolchain installer.
      </Text>

      {installState === 'idle' && (
        <>
          <SetupCommandCard
            description={(
              <>
                This will install <Text style={styles.mono}>rustc</Text>, <Text style={styles.mono}>cargo</Text>, and{' '}
                <Text style={styles.mono}>rustup</Text> to <Text style={styles.mono}>~/.cargo/bin</Text>.
              </>
            )}
            commands={[INSTALL_CMD]}
          />

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleStart}
            activeOpacity={0.7}
          >
            <Download color={colors.primaryText} size={18} strokeWidth={2.25} />
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Install Rust</Text>
          </TouchableOpacity>
        </>
      )}

      {installState !== 'idle' && (
        <>
          {installState === 'installing' && (
            <SetupProgressCard tone="running" message="Installing Rust..." />
          )}

          {installState === 'verifying' && (
            <SetupProgressCard tone="running" message="Verifying installation..." />
          )}

          {installState === 'success' && (
            <SetupProgressCard tone="success" message="Rust installed and verified" />
          )}

          {installState === 'install-failed' && (
            <SetupProgressCard tone="error" message="Installation failed" />
          )}

          {installState === 'verify-failed' && (
            <SetupProgressCard tone="warning" message="Installed but not detected" icon={AlertTriangle} />
          )}

          {verifyError && (
            <Text style={[styles.verifyErrorText, { color: colors.textSecondary }]}>
              {verifyError}
            </Text>
          )}

          <SetupTerminalPanel
            visible={showOutput}
            onToggle={() => setShowOutput(!showOutput)}
            output={output}
            scrollRef={scrollRef}
          />

          {installState === 'success' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleContinue}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Continue</Text>
              <ArrowRight color={colors.primaryText} size={18} strokeWidth={2.25} />
            </TouchableOpacity>
          )}

          {(installState === 'install-failed' || installState === 'verify-failed') && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={handleRetry}
              activeOpacity={0.7}
            >
              <RefreshCw color="#fff" size={16} strokeWidth={2.25} />
              <Text style={[styles.buttonText, { color: '#fff' }]}>Retry</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <SudoPrompt
        visible={showSudoPrompt}
        onSubmit={submitSudoPassword}
        onCancel={cancelSudoPrompt}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  iconRow: {
    alignItems: 'center',
    marginTop: spacing[4],
  },
  headerLogo: {
    width: 48,
    height: 48,
  },
  title: {
    ...typeStyles.screenTitle,
    textAlign: 'center',
  },
  subtitle: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  infoText: {
    ...typeStyles.bodySmall,
  },
  mono: {
    fontFamily: 'monospace',
  },
  commandList: {
    gap: spacing[1],
  },
  commandText: {
    ...typeStyles.mono,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  verifyErrorText: {
    ...typeStyles.meta,
    textAlign: 'center',
    paddingHorizontal: spacing[2],
  },
  statusText: {
    ...typeStyles.button,
  },
  outputToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  outputToggleText: {
    ...typeStyles.bodyStrong,
  },
  outputBox: {
    maxHeight: 150,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  outputText: {
    ...typeStyles.mono,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    ...typeStyles.button,
  },
})
