import React from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import BauhausButton from '../shared/BauhausButton'
import { typeStyles } from '../../theme/typography'

interface Props {
  visible: boolean
  onAgree: () => void
  onCancel: () => void
}

export default function PushConsentSheet({ visible, onAgree, onCancel }: Props) {
  const { colors } = useTheme()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Enable Push Notifications</Text>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
          <BauhausButton onPress={onAgree}>
            Enable Notifications
          </BauhausButton>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
