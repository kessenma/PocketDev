import React, { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { X } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import type { EnvVar } from '@pocketdev/shared/types'
import { useTheme } from '../../../contexts/ThemeContext'
import { useEnvStore } from '../../../stores/env'

type Props = {
  visible: boolean
  projectPath: string
  editTarget: EnvVar | null  // null = create mode
  onClose: () => void
}

export default function EnvVarEditSheet({ visible, projectPath, editTarget, onClose }: Props) {
  const { colors } = useTheme()
  const create = useEnvStore((s) => s.create)
  const update = useEnvStore((s) => s.update)

  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [comment, setComment] = useState('')
  const [isSecret, setIsSecret] = useState(false)
  const [isMultiline, setIsMultiline] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      if (editTarget) {
        setKey(editTarget.key)
        setValue(editTarget.value ?? '')
        setComment(editTarget.comment ?? '')
        setIsSecret(editTarget.isSecret)
        setIsMultiline(editTarget.isMultiline)
      } else {
        setKey('')
        setValue('')
        setComment('')
        setIsSecret(false)
        setIsMultiline(false)
      }
      setError(null)
    }
  }, [visible, editTarget])

  async function handleSave() {
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
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.panel }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {editTarget ? 'Edit Variable' : 'New Variable'}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X color={colors.textSecondary} size={20} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
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

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
            >
              <Text style={[styles.saveText, { color: colors.primaryText }]}>
                {saving ? 'Saving…' : (editTarget ? 'Save' : 'Add')}
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
    maxHeight: '90%',
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
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  fieldGroup: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  label: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  labelHint: {
    ...typographyScale.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    ...typographyScale.base,
    fontFamily: 'Courier New',
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
  errorBanner: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
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
  saveBtn: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  saveText: {
    ...typographyScale.base,
    fontWeight: '700',
  },
})
