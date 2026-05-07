import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, Platform } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useConnectionStore } from '../../stores/connection'
import { BauhausPanel } from '../shared/BauhausPanel'
import { Button } from '../ui/Button'
import BauhausBadge from '../shared/BauhausBadge'
import { typeStyles } from '../../theme/typography'
import { getPushNotificationsEnabled, setPushNotificationsEnabled } from '../../services/storage'
import { enablePushNotifications, disablePushNotifications } from '../../services/push-notifications'
import PushConsentSheet from './PushConsentSheet'

export default function PushNotificationsSection() {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)
  const [enabled, setEnabled] = useState(getPushNotificationsEnabled)
  const [loading, setLoading] = useState(false)
  const [consentVisible, setConsentVisible] = useState(false)

  if (Platform.OS !== 'ios') return null

  async function handleEnable() {
    if (!server) {
      Alert.alert('Not Connected', 'Connect to an agent before enabling push notifications.')
      return
    }
    setConsentVisible(true)
  }

  async function handleAgree() {
    setConsentVisible(false)
    if (!server) return
    setLoading(true)
    try {
      const result = await enablePushNotifications(server)
      if (!result.success) {
        const msg = result.error === 'Permission denied'
          ? 'Enable notifications in iOS Settings to use this feature.'
          : (result.error ?? 'Something went wrong enabling notifications.')
        Alert.alert('Could Not Enable', msg)
        return
      }
      setPushNotificationsEnabled(true)
      setEnabled(true)
    } catch (err) {
      Alert.alert('Error', 'Something went wrong enabling notifications.')
      console.error('[push] enable error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable() {
    if (!server) return
    setLoading(true)
    try {
      await disablePushNotifications(server)
    } catch {}
    setPushNotificationsEnabled(false)
    setEnabled(false)
    setLoading(false)
  }

  return (
    <>
      <BauhausPanel style={styles.section} accentColor={colors.accentGreen}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Push Notifications</Text>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
          <BauhausBadge
            label={enabled ? 'Enabled' : 'Disabled'}
            color={enabled ? '#22c55e' : '#6b7280'}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Triggers</Text>
          <Text style={[styles.value, { color: colors.text }]}>Permission requests, task completion</Text>
        </View>

        {enabled ? (
          <Button variant="danger" onPress={handleDisable} loading={loading}>
            Disable Notifications
          </Button>
        ) : (
          <Button onPress={handleEnable} loading={loading}>
            Enable Notifications
          </Button>
        )}
      </BauhausPanel>

      {consentVisible && (
        <PushConsentSheet
          onAgree={handleAgree}
          onDismiss={() => setConsentVisible(false)}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    ...typeStyles.sectionTitle,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typeStyles.bodySmall,
  },
  value: {
    ...typeStyles.bodyStrong,
    flexShrink: 1,
    textAlign: 'right',
  },
})
