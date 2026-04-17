import React, { useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { ArrowLeft, ClipboardList } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import type { BulkEnvVarItem, EnvVar } from '@pocketdev/shared/types'
import { useTheme } from '../../../contexts/ThemeContext'
import { useEnvStore } from '../../../stores/env'
import { typeStyles } from '../../../theme/typography'

type Props = {
  projectPath: string
  editTarget: EnvVar | null  // null = create mode
  onDismiss: () => void
}

type Mode = 'single' | 'bulk'

function parseDotEnv(text: string): BulkEnvVarItem[] {
  const items: BulkEnvVarItem[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx < 1) continue
    const key = line.slice(0, eqIdx).trim().replace(/\s+/g, '_')
    if (!key) continue
    let value = line.slice(eqIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    items.push({ key, value: value || null })
  }
  return items
}

export default function EnvVarEditSheet({ projectPath, editTarget, onDismiss }: Props) {
  const { colors } = useTheme()
  const sheetRef = useRef<TrueSheet>(null)
  const create = useEnvStore((s) => s.create)
  const update = useEnvStore((s) => s.update)
  const bulkUpsert = useEnvStore((s) => s.bulkUpsert)

  // Single mode state
  const [key, setKey] = useState(editTarget?.key ?? '')
  const [value, setValue] = useState(editTarget?.value ?? '')
  const [comment, setComment] = useState(editTarget?.comment ?? '')
  const [isSecret, setIsSecret] = useState(editTarget?.isSecret ?? false)
  const [isMultiline, setIsMultiline] = useState(editTarget?.isMultiline ?? false)

  // Bulk mode state
  const [bulkText, setBulkText] = useState('')

  const [mode, setMode] = useState<Mode>('single')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedBulk = parseDotEnv(bulkText)

  // Force single mode when editing an existing var
  const activeMode = editTarget ? 'single' : mode

  useEffect(() => {
    sheetRef.current?.present()
  }, [])

  async function handleSaveSingle() {
    if (!key.trim()) { setError('Key is required'); return }
    setSaving(true)
    setError(null)
    try {
      if (editTarget) {
        await update(editTarget.id, {
          key: key.trim(),
          value: value || null,
          comment: comment.trim() || null,
          isSecret,
          isMultiline,
        })
      } else {
        await create({
          projectPath,
          key: key.trim(),
          value: value || null,
          comment: comment.trim() || null,
          isSecret,
          isMultiline,
        })
      }
      sheetRef.current?.dismiss()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveBulk() {
    if (parsedBulk.length === 0) { setError('No valid KEY=value lines found'); return }
    setSaving(true)
    setError(null)
    try {
      await bulkUpsert(projectPath, parsedBulk)
      sheetRef.current?.dismiss()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setSaving(false)
    }
  }

  const title = editTarget ? 'Edit Variable' : 'Add Variable'
  const saveLabel = saving ? 'Saving…' : activeMode === 'bulk'
    ? `Import ${parsedBulk.length > 0 ? parsedBulk.length : ''}`
    : (editTarget ? 'Save' : 'Add')

  return (
    <TrueSheet ref={sheetRef} detents={[1]} backgroundColor={colors.background} cornerRadius={24} onDidDismiss={onDismiss}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Nav bar */}
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => sheetRef.current?.dismiss()} activeOpacity={0.7} style={styles.backBtn}>
            <ArrowLeft color={colors.text} size={20} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>{title}</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Mode tabs — only show for new variable */}
        {!editTarget && (
          <View style={[styles.tabs, { backgroundColor: colors.backgroundSecondary }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => { setMode('single'); setError(null) }}
              style={[styles.tab, activeMode === 'single' && { backgroundColor: colors.surface, borderRadius: borderRadius.md }]}
            >
              <Text style={[styles.tabText, { color: activeMode === 'single' ? colors.text : colors.textSecondary }]}>
                Single
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => { setMode('bulk'); setError(null) }}
              style={[styles.tab, activeMode === 'bulk' && { backgroundColor: colors.surface, borderRadius: borderRadius.md }]}
            >
              <ClipboardList color={activeMode === 'bulk' ? colors.text : colors.textSecondary} size={14} strokeWidth={2} style={{ marginRight: 5 }} />
              <Text style={[styles.tabText, { color: activeMode === 'bulk' ? colors.text : colors.textSecondary }]}>
                Bulk Paste
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {activeMode === 'single' ? (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Key</Text>
                <TextInput
                  value={key}
                  onChangeText={setKey}
                  placeholder="VARIABLE_NAME"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus={!editTarget}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Value</Text>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder="value"
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.input,
                    isMultiline && styles.multilineInput,
                    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                  ]}
                  multiline={isMultiline}
                  secureTextEntry={isSecret && !isMultiline}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Comment (optional)</Text>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Describe this variable"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  autoCapitalize="sentences"
                  maxLength={256}
                />
              </View>

              <View style={[styles.toggleRow, { borderColor: colors.border }]}>
                <View style={styles.toggleLabel}>
                  <Text style={[styles.label, { color: colors.text }]}>Secret</Text>
                  <Text style={[styles.labelHint, { color: colors.textTertiary }]}>Mask value in UI</Text>
                </View>
                <Switch
                  value={isSecret}
                  onValueChange={setIsSecret}
                  trackColor={{ true: colors.accentGreen }}
                />
              </View>

              <View style={[styles.toggleRow, { borderColor: colors.border }]}>
                <View style={styles.toggleLabel}>
                  <Text style={[styles.label, { color: colors.text }]}>Multiline</Text>
                  <Text style={[styles.labelHint, { color: colors.textTertiary }]}>Allow newlines in value</Text>
                </View>
                <Switch
                  value={isMultiline}
                  onValueChange={setIsMultiline}
                  trackColor={{ true: colors.accentGreen }}
                />
              </View>

              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.errorBackground }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              ) : null}
            </ScrollView>
          ) : (
            <View style={styles.bulkBody}>
              <Text style={[styles.bulkHint, { color: colors.textTertiary }]}>
                Paste the contents of a .env file. Each line should be KEY=value. Lines starting with # are ignored.
              </Text>
              <TextInput
                value={bulkText}
                onChangeText={setBulkText}
                placeholder={'DATABASE_URL=postgres://...\nAPI_KEY=sk-...\nPORT=3000'}
                placeholderTextColor={colors.textTertiary}
                style={[styles.bulkTextarea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="top"
                autoFocus
              />
              {parsedBulk.length > 0 && (
                <View style={[styles.previewBanner, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.previewText, { color: colors.textSecondary }]}>
                    {parsedBulk.length} variable{parsedBulk.length !== 1 ? 's' : ''} detected
                  </Text>
                </View>
              )}
              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.errorBackground }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <TouchableOpacity
              onPress={() => sheetRef.current?.dismiss()}
              activeOpacity={0.7}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={activeMode === 'bulk' ? handleSaveBulk : handleSaveSingle}
              disabled={saving || (activeMode === 'bulk' && parsedBulk.length === 0)}
              activeOpacity={0.7}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: (saving || (activeMode === 'bulk' && parsedBulk.length === 0)) ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[styles.saveText, { color: colors.primaryText }]}>{saveLabel}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TrueSheet>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...typeStyles.bodyBold,
  },
  tabs: {
    flexDirection: 'row',
    margin: spacing[4],
    borderRadius: borderRadius.lg,
    padding: spacing[1],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    gap: spacing[1],
  },
  tabText: {
    ...typeStyles.button,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  fieldGroup: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  label: {
    ...typeStyles.button,
  },
  labelHint: {
    ...typeStyles.meta,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...typeStyles.mono,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing[2],
  },
  toggleLabel: {
    gap: 2,
    flex: 1,
  },
  bulkBody: {
    flex: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    gap: spacing[3],
  },
  bulkHint: {
    ...typeStyles.bodySmall,
  },
  bulkTextarea: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    ...typeStyles.mono,
    minHeight: 200,
  },
  previewBanner: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  previewText: {
    ...typeStyles.button,
  },
  errorBanner: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  errorText: {
    ...typeStyles.button,
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
    ...typeStyles.bodyBold,
  },
  saveBtn: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  saveText: {
    ...typeStyles.bodyBold,
  },
})
