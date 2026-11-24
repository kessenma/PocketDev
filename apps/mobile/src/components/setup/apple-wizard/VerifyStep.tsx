import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { Check, RefreshCw, XCircle } from 'lucide-react-native'
import type { AppleVerifyResult } from '@pocketdev/shared/types'
import { useTheme } from '../../../contexts/ThemeContext'
import { useConnectionStore } from '../../../stores/connection'
import { postAppleVerify } from '../../../services/api'
import { playInstallSuccessHaptic } from '../shared/haptics'
import type { AppleStepProps } from './XcodeStep'
import { stepStyles as styles } from './styles'

const MAX_APPS = 5

interface Props extends AppleStepProps {
  onVerified: (result: AppleVerifyResult) => void
}

export default function VerifyStep({ status, onStatus, onVerified }: Props) {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AppleVerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  const handleVerify = useCallback(async () => {
    if (!server) return
    setLoading(true)
    setError(null)
    try {
      const res = await postAppleVerify(server.ip, server.port)
      setResult(res)
      onStatus(res.status)
      if (res.ok) {
        playInstallSuccessHaptic()
        onVerified(res)
      } else {
        setError(res.error ?? 'App Store Connect didn’t respond as expected.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach App Store Connect.')
    } finally {
      setLoading(false)
    }
  }, [server, onStatus, onVerified])

  useEffect(() => {
    if (startedRef.current || !status.account.configured) return
    startedRef.current = true
    handleVerify()
  }, [status.account.configured, handleVerify])

  const apps = result?.ok ? result.apps : []
  const notConfigured = !status.account.configured

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.title, { color: colors.text }]}>Verify</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Checks that asc can reach App Store Connect with this Mac’s key.
      </Text>

      {notConfigured && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            No App Store Connect key yet. Go back to the Account step to add one.
          </Text>
        </View>
      )}

      {loading && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>Talking to App Store Connect…</Text>
          </View>
        </View>
      )}

      {!loading && result?.ok && (
        <View style={[styles.card, styles.successCard]}>
          <View style={styles.cardHeader}>
            <Check color="#22c55e" size={18} strokeWidth={2.5} />
            <Text style={[styles.cardTitle, styles.successText]}>App Store Connect is connected</Text>
          </View>
          {apps.length === 0 ? (
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
              The key works. There are no apps in this App Store Connect team yet.
            </Text>
          ) : (
            <>
              <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
                Found {apps.length} app{apps.length === 1 ? '' : 's'}:
              </Text>
              {apps.slice(0, MAX_APPS).map((app) => (
                <View key={app.id}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{app.name}</Text>
                  {app.bundle_id ? (
                    <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>{app.bundle_id}</Text>
                  ) : null}
                </View>
              ))}
              {apps.length > MAX_APPS && (
                <Text style={[styles.cardBody, { color: colors.textTertiary }]}>
                  and {apps.length - MAX_APPS} more
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {!loading && error && (
        <View style={[styles.card, { backgroundColor: colors.errorBackground, borderColor: colors.error }]}>
          <View style={styles.cardHeader}>
            <XCircle color={colors.error} size={18} strokeWidth={2.25} />
            <Text style={[styles.cardTitle, { color: colors.error }]}>Couldn’t verify</Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{error}</Text>
        </View>
      )}

      {!loading && !notConfigured && (
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={handleVerify}
          activeOpacity={0.7}
        >
          <RefreshCw color={colors.text} size={16} strokeWidth={2.25} />
          <Text style={[styles.buttonText, { color: colors.text }]}>{result ? 'Check again' : 'Check connection'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}
