import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing, typographyScale } from '@pocketdev/shared/theme'
import { useConnectionStore } from '../../../stores/connection'
import { fetchDockerSetupStatus } from '../../../services/api'
import DockerSetupAnimation from '../../animations/DockerSetupAnimation'
import { RefreshCw } from 'lucide-react-native'
import type { DockerSetupStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'DETECTION_COMPLETE'; dockerStatus: DockerSetupStatus }
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
  const [statusResult, setStatusResult] = useState<DockerSetupStatus | null>(null)

  useEffect(() => {
    detect()
  }, [])

  // Once both animation and API call are done, dispatch
  useEffect(() => {
    if (animationDone && statusResult) {
      dispatch({ type: 'DETECTION_COMPLETE', dockerStatus: statusResult })
    }
  }, [animationDone, statusResult])

  async function detect() {
    if (!server) return
    setLoading(true)
    setError(null)
    try {
      const status = await fetchDockerSetupStatus(server.ip, server.port)
      setStatusResult(status)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check Docker status'
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
      <DockerSetupAnimation onComplete={() => setAnimationDone(true)} />
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
