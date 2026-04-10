import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { X } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import type { BulkEnvVarItem } from '@pocketdev/shared/types'
import { useTheme } from '../../../contexts/ThemeContext'
import { useEnvStore } from '../../../stores/env'

type Props = {
  visible: boolean
  projectPath: string
  onClose: () => void
}

function parseDotEnv(text: string): BulkEnvVarItem[] {
  const items: BulkEnvVarItem[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    // Skip blanks and comments
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx < 1) continue
    const rawKey = line.slice(0, eqIdx).trim()
    if (!rawKey) continue
    const key = rawKey.replace(/\s+/g, '_')
    let value = line.slice(eqIdx + 1).trim()
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    items.push({ key, value: value || null })
  }
  return items
}

export default function DotEnvImportSheet({ visible, projectPath, onClose }: Props) {
  const { colors } = useTheme()
  const bulkUpsert = useEnvStore((s) => s.bulkUpsert)

  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = parseDotEnv(text)

  async function handleImport() {
    if (parsed.length === 0) { setError('No valid KEY=value lines found'); return }
    setImporting(true)
    setError(null)
    try {
      await bulkUpsert(projectPath, parsed)
      setText('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    setText('')
    setError(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.panel }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Import .env</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <X color={colors.textSecondary} size={20} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              Paste the contents of a .env file. Lines starting with # are ignored.
            </Text>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={'DATABASE_URL=postgres://...\nAPI_KEY=sk-...'}
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.textarea,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              textAlignVertical="top"
            />

            {parsed.length > 0 ? (
              <View style={[styles.previewBanner, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.previewText, { color: colors.textSecondary }]}>
                  {parsed.length} variable{parsed.length !== 1 ? 's' : ''} detected
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorBackground }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleImport}
              disabled={importing || parsed.length === 0}
              activeOpacity={0.7}
              style={[
                styles.importBtn,
                { backgroundColor: colors.primary, opacity: (importing || parsed.length === 0) ? 0.5 : 1 },
              ]}
            >
              <Text style={[styles.importText, { color: colors.primaryText }]}>
                {importing ? 'Importing…' : `Import ${parsed.length > 0 ? parsed.length : ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  hint: {
    ...typographyScale.sm,
  },
  textarea: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    ...typographyScale.sm,
    fontFamily: 'Courier New',
    minHeight: 160,
  },
  previewBanner: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  previewText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  errorBanner: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  errorText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  cancelText: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  importBtn: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  importText: {
    ...typographyScale.base,
    fontWeight: '700',
  },
})
