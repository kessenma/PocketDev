import React, { useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native'
import { Info, X } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'
import { Sheet, type SheetHandle } from '../ui/Sheet'

const ASC_URL = 'https://asccli.sh'

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'What is asc?',
    body: 'asc is an open-source command-line tool for Apple’s App Store Connect API. Agents use it to upload builds to TestFlight and check on your apps.',
  },
  {
    title: 'What gets set up',
    body: 'Xcode, the asc CLI, and an App Store Connect API key stored in this Mac’s Keychain.',
  },
  {
    title: 'What you need',
    body: 'A Mac running PocketDev and an Apple Developer Program membership. Creating a key needs the Account Holder or Admin role in your team.',
  },
  {
    title: 'Where your secrets go',
    body: 'Your Apple password and 2FA code are typed straight into Apple’s sign-in prompt running on your Mac. PocketDev doesn’t save them. The key file (.p8) is saved in ~/.asc/keys on the Mac.',
  },
  {
    title: 'Revoking access',
    body: 'Each Mac gets its own key. You can revoke it any time in App Store Connect → Users and Access → Integrations.',
  },
]

interface Props {
  onDismiss: () => void
}

export default function AscInfoSheet({ onDismiss }: Props) {
  const { colors } = useTheme()
  const sheetRef = useRef<SheetHandle>(null)

  return (
    <Sheet ref={sheetRef} detents={['auto', 1]} onDismiss={onDismiss}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Info color={colors.text} size={18} strokeWidth={2.2} />
          <Text style={[styles.title, { color: colors.text }]}>About App Store setup</Text>
        </View>
        <TouchableOpacity onPress={() => sheetRef.current?.dismiss()} hitSlop={8} activeOpacity={0.7}>
          <X color={colors.textSecondary} size={20} strokeWidth={2.25} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{section.body}</Text>
          </View>
        ))}
        <TouchableOpacity onPress={() => { Linking.openURL(ASC_URL).catch(() => {}) }} activeOpacity={0.7}>
          <Text style={[styles.link, { color: colors.primary }]}>asccli.sh</Text>
        </TouchableOpacity>
      </ScrollView>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    ...typeStyles.heading,
  },
  body: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  section: {
    gap: spacing[1],
  },
  sectionTitle: {
    ...typeStyles.bodyBold,
  },
  sectionBody: {
    ...typeStyles.bodySmall,
  },
  link: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
  },
})
