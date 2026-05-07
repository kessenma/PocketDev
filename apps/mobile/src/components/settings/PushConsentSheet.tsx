import React, { useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { Sheet, type SheetHandle } from '../ui/Sheet'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { Button } from '../ui/Button'
import { typeStyles } from '../../theme/typography'

interface Props {
  onAgree: () => void
  onDismiss: () => void
}

export default function PushConsentSheet({ onAgree, onDismiss }: Props) {
  const { colors } = useTheme()
  const sheetRef = useRef<SheetHandle>(null)

  return (
    <Sheet
      ref={sheetRef}
      detents={[1]}
      onDismiss={onDismiss}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Enable Push Notifications</Text>
        <TouchableOpacity onPress={() => sheetRef.current?.dismiss()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.cancelLink, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.body, { color: colors.text }]}>
            Push notifications let PocketDev alert you when a task needs your approval or finishes — even when the app is closed.
          </Text>

          <Text style={[styles.heading, { color: colors.text }]}>What's shared with PocketDev servers</Text>

          <Text style={[styles.bullet, { color: colors.textSecondary }]}>
            {'• '}A push token assigned by Apple to identify your device for notification delivery.
          </Text>
          <Text style={[styles.bullet, { color: colors.textSecondary }]}>
            {'• '}Whether each notification was delivered successfully.
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            PocketDev servers (pocketdev.run) act as a relay between your agent and Apple's notification service. Your agent's content — task output, files, and code — is never sent to PocketDev servers.
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            You can disable notifications at any time from Settings.
          </Text>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button onPress={onAgree}>
            Enable Notifications
          </Button>
        </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  title: {
    ...typeStyles.screenTitle,
  },
  cancelLink: {
    ...typeStyles.body,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    gap: spacing[4],
    paddingBottom: spacing[6],
  },
  heading: {
    ...typeStyles.bodyStrong,
    marginTop: spacing[2],
  },
  body: {
    ...typeStyles.body,
    lineHeight: 22,
  },
  bullet: {
    ...typeStyles.body,
    lineHeight: 22,
  },
  footer: {
    padding: spacing[5],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
