import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { fetchCodexSetupStatus, fetchPrerequisites } from '../../../services/api'
import CodexSetupAnimation from '../../animations/CodexSetupAnimation'
import { RefreshCw } from 'lucide-react-native'
import type { CodexSetupStatus } from '@pocketdev/shared/types'
import { getCodexBlockedReason } from '../setup-tool-utils'

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; codexStatus: CodexSetupStatus; npmReady: boolean }
  | { type: 'STEP_FAILED'; step: 'detect'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function DetectStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [animationDone, setAnimationDone] = useState(false)
  const [statusResult, setStatusResult] = useState<CodexSetupStatus | null>(null)
  const [npmReady, setNpmReady] = useState(false)

  useEffect(() => {
    detect()
  }, [])

  // Once both animation and API call are done, dispatch
  useEffect(() => {
    if (animationDone && statusResult) {
      dispatch({ type: 'DETECTION_COMPLETE', codexStatus: statusResult, npmReady })
    }
  }, [animationDone, statusResult, npmReady])

  async function detect() {
    if (!server) return
    setLoading(true)
    setError(null)
    try {
      const [status, prerequisites] = await Promise.all([
        fetchCodexSetupStatus(server.ip, server.port),
        fetchPrerequisites(server.ip, server.port),
      ])
      setStatusResult(status)
      setNpmReady(!getCodexBlockedReason(prerequisites))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check Codex CLI status'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'detect', error: message })
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { borderColor: colors.border }]}
          onPress={() => { setError(null); detect() }}
          activeOpacity={0.7}
        >
          <RefreshCw color={colors.text} size={16} strokeWidth={2.25} />
          <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CodexSetupAnimation onComplete={() => setAnimationDone(true)} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[6],
  },
  errorText: {
    ...typographyScale.sm,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  retryText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
})
