import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, Platform } from 'react-native'
import { Bell, BellOff, BellRing, Zap } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useConnectionStore } from '../../stores/connection'
import { Card, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import Badge from '../ui/Badge'
import { typeStyles } from '../../theme/typography'
import { getPushNotificationsEnabled, setPushNotificationsEnabled } from '../../services/storage'
import { enablePushNotifications, disablePushNotifications } from '../../services/push-notifications'
import PushConsentSheet from './PushConsentSheet'

export default function PushNotificationsCard() {
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
      <Card style={styles.card} accentColor={colors.bracketAccent}>
        <CardTitle>Push Notifications</CardTitle>

        <View style={styles.row}>
          <View style={styles.labelRow}>
            <Bell size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
          </View>
          <Badge
            label={enabled ? 'Enabled' : 'Disabled'}
            color={enabled ? colors.accentGreen : colors.textTertiary}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.labelRow}>
            <Zap size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Triggers</Text>
          </View>
          <Text style={[styles.value, { color: colors.text }]}>Approvals, task completion</Text>
        </View>

        {enabled ? (
          <Button variant="danger" leftIcon={BellOff} onPress={handleDisable} loading={loading}>
            Disable Notifications
          </Button>
        ) : (
          <Button leftIcon={BellRing} onPress={handleEnable} loading={loading}>
            Enable Notifications
          </Button>
        )}
      </Card>

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
  card: {
    gap: spacing[3],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
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
