import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, Platform } from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useConnectionStore } from '../../stores/connection'
import { BauhausPanel } from '../shared/BauhausPanel'
import BauhausButton from '../shared/BauhausButton'
import BauhausBadge from '../shared/BauhausBadge'
import { typeStyles } from '../../theme/typography'
import {
  getPushNotificationsEnabled,
  setPushNotificationsEnabled,
} from '../../services/storage'
import {
  registerForRemoteNotifications,
  waitForApnsToken,
} from '../../services/push-token'
import { registerPushToken, deregisterPushToken } from '../../services/api'
import PushConsentSheet from './PushConsentSheet'
import { PushNotificationIOS } from 'react-native'

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
      // Request iOS permission
      const perms = await PushNotificationIOS.requestPermissions({ alert: true, badge: true, sound: true })
      if (!perms.alert) {
        Alert.alert('Permission Denied', 'Enable notifications in iOS Settings to use this feature.')
        return
      }
      // Trigger APNs registration and wait for token
      await registerForRemoteNotifications()
      const token = await waitForApnsToken(8000)
      if (!token) {
        Alert.alert('Registration Failed', 'Could not get a push token from Apple. Try again later.')
        return
      }
      const env = __DEV__ ? 'development' : 'production'
      await registerPushToken(server.ip, server.port, server.deviceId, token, env)
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
      await deregisterPushToken(server.ip, server.port, server.deviceId)
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
          <BauhausButton variant="danger" onPress={handleDisable} loading={loading}>
            Disable Notifications
          </BauhausButton>
        ) : (
          <BauhausButton onPress={handleEnable} loading={loading}>
            Enable Notifications
          </BauhausButton>
        )}
      </BauhausPanel>

      <PushConsentSheet
        visible={consentVisible}
        onAgree={handleAgree}
        onCancel={() => setConsentVisible(false)}
      />
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
