import React, { useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import DeviceInfo from 'react-native-device-info'
import { CheckCircle, ExternalLink } from 'lucide-react-native'
import { Sheet, type SheetHandle } from '../ui/Sheet'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { Button } from '../ui/Button'
import { typeStyles } from '../../theme/typography'
import { reportBugViaServer } from '../../services/api'
import { getGitHubPAT, createGitHubIssueDirect } from '../../services/github'
import type { StoredServer } from '../../services/storage'

type Props = {
  mobileVersion: string
  agentVersion: string | null
  server: StoredServer | null
  status: string
  canReportViaServer: boolean
  onDismiss: () => void
}

function buildIssueBody(description: string, mobileVersion: string, agentVersion: string | null, status: string): string {
  const device = DeviceInfo.getModel()
  const os = `${Platform.OS} ${DeviceInfo.getSystemVersion()}`
  return [
    '## Description',
    description,
    '',
    '## System Info',
    '| Field | Value |',
    '|-------|-------|',
    `| App Version | ${mobileVersion} |`,
    `| Agent Version | ${agentVersion ?? 'unknown'} |`,
    `| Device | ${device} |`,
    `| OS | ${os} |`,
    `| Connection | ${status} |`,
  ].join('\n')
}

export default function BugReportSheet({
  mobileVersion,
  agentVersion,
  server,
  status,
  canReportViaServer,
  onDismiss,
}: Props) {
  const { colors } = useTheme()
  const sheetRef = useRef<SheetHandle>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)

  async function handleSubmit() {
    if (!title.trim()) { setError('Please enter a title for the bug report.'); return }
    if (!description.trim()) { setError('Please describe the bug.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const body = buildIssueBody(description.trim(), mobileVersion, agentVersion, status)
      let url: string
      if (canReportViaServer && server) {
        const result = await reportBugViaServer(server.ip, server.port, title.trim(), body)
        url = result.url
      } else {
        const pat = await getGitHubPAT()
        if (!pat) throw new Error('No GitHub token configured. Add one in the Bug Report card.')
        const result = await createGitHubIssueDirect({ token: pat, title: title.trim(), body })
        url = result.url
      }
      setSuccessUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit bug report.')
    } finally {
      setSubmitting(false)
    }
  }

  if (successUrl) {
    return (
      <Sheet ref={sheetRef} detents={[1]} onDismiss={onDismiss}>
        <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
          <CheckCircle size={48} color={colors.accentGreen} strokeWidth={1.5} />
          <Text style={[typeStyles.screenTitle, { color: colors.text, textAlign: 'center' }]}>
            Bug reported!
          </Text>
          <Text style={[typeStyles.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Your issue has been created on GitHub.
          </Text>
          <Button leftIcon={ExternalLink} variant="secondary" onPress={() => Linking.openURL(successUrl)}>
            View on GitHub
          </Button>
          <Button variant="quiet" onPress={() => sheetRef.current?.dismiss()}>
            Done
          </Button>
        </View>
      </Sheet>
    )
  }

  return (
    <Sheet ref={sheetRef} detents={[1]} onDismiss={onDismiss}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[typeStyles.screenTitle, { color: colors.text }]}>Report a Bug</Text>
          <TouchableOpacity onPress={() => sheetRef.current?.dismiss()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[typeStyles.body, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Short description of the problem"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                autoCapitalize="sentences"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Steps to reproduce, what you expected, what happened…"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, styles.multilineInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                multiline
                autoCapitalize="sentences"
                textAlignVertical="top"
              />
            </View>

            <View style={[styles.systemInfoBox, { backgroundColor: colors.panelAlt, borderColor: colors.border }]}>
              <Text style={[typeStyles.meta, { color: colors.textSecondary, marginBottom: spacing[2] }]}>
                INCLUDED AUTOMATICALLY
              </Text>
              <Text style={[typeStyles.bodySmall, { color: colors.textTertiary }]}>
                App v{mobileVersion}{agentVersion ? ` · Agent v${agentVersion}` : ''} · {DeviceInfo.getModel()} · {Platform.OS} {DeviceInfo.getSystemVersion()} · {status}
              </Text>
            </View>

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorBackground }]}>
                <Text style={[typeStyles.bodySmall, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <Button loading={submitting} onPress={handleSubmit}>
              Submit Report
            </Button>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
    gap: spacing[4],
  },
  fieldGroup: {
    gap: spacing[2],
  },
  label: {
    ...typeStyles.button,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...typeStyles.body,
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  systemInfoBox: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  errorBanner: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[4],
  },
})
