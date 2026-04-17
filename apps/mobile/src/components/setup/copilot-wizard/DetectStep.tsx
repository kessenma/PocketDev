import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { useConnectionStore } from '../../../stores/connection'
import { fetchCopilotSetupStatus } from '../../../services/api'
import CopilotSetupAnimation from '../../animations/CopilotSetupAnimation'
import { RefreshCw } from 'lucide-react-native'
import type { CopilotSetupStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; copilotStatus: CopilotSetupStatus }
  | { type: 'STEP_FAILED'; step: 'detect'; error: string }

interface Props {
  dispatch: (action: WizardAction) => void
}

export default function DetectStep({ dispatch }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [error, setError] = useState<string | null>(null)
  const [animationDone, setAnimationDone] = useState(false)
  const [statusResult, setStatusResult] = useState<CopilotSetupStatus | null>(null)

  useEffect(() => {
    void detect()
  }, [])

  useEffect(() => {
    if (animationDone && statusResult) {
      dispatch({ type: 'DETECTION_COMPLETE', copilotStatus: statusResult })
    }
  }, [animationDone, dispatch, statusResult])

  async function detect() {
    if (!server) return
    setError(null)
    try {
      const status = await fetchCopilotSetupStatus(server.ip, server.port)
      setStatusResult(status)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check GitHub Copilot status.'
      setError(message)
      dispatch({ type: 'STEP_FAILED', step: 'detect', error: message })
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { borderColor: colors.border }]}
          onPress={() => { void detect() }}
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
      <CopilotSetupAnimation onComplete={() => setAnimationDone(true)} />
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
    ...typeStyles.bodySmall,
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
    ...typeStyles.button,
  },
})
