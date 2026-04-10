import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import type { EnvVar } from '@pocketdev/shared/types'
import { useTheme } from '../../../contexts/ThemeContext'

type Props = {
  item: EnvVar
  onEdit: () => void
  onDelete: () => void
}

export default function EnvVarRow({ item, onEdit, onDelete }: Props) {
  const { colors } = useTheme()
  const [revealed, setRevealed] = useState(false)

  const displayValue = item.isSecret && !revealed
    ? '••••••••'
    : (item.value ?? '')

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.keyValueBlock}>
        <View style={styles.keyRow}>
          <Text style={[styles.key, { color: colors.text }]} numberOfLines={1}>
            {item.key}
          </Text>
          {item.isSecret ? (
            <Text style={[styles.secretBadge, { color: colors.accentGreen, borderColor: colors.accentGreen }]}>
              secret
            </Text>
          ) : null}
        </View>

        <View style={styles.valueRow}>
          <Text
            style={[styles.value, { color: item.value ? colors.textSecondary : colors.textTertiary }]}
            numberOfLines={item.isMultiline ? 4 : 1}
          >
            {item.value !== null ? displayValue : '(empty)'}
          </Text>
          {item.isSecret ? (
            <TouchableOpacity onPress={() => setRevealed(!revealed)} activeOpacity={0.7} hitSlop={8}>
              {revealed
                ? <EyeOff color={colors.textTertiary} size={14} strokeWidth={2.2} />
                : <Eye color={colors.textTertiary} size={14} strokeWidth={2.2} />
              }
            </TouchableOpacity>
          ) : null}
        </View>

        {item.comment ? (
          <Text style={[styles.comment, { color: colors.textTertiary }]} numberOfLines={2}>
            {item.comment}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.7}
          style={[styles.actionButton, { borderColor: colors.border }]}
          hitSlop={4}
        >
          <Pencil color={colors.textSecondary} size={14} strokeWidth={2.2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          activeOpacity={0.7}
          style={[styles.actionButton, { borderColor: colors.border }]}
          hitSlop={4}
        >
          <Trash2 color={colors.error} size={14} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  keyValueBlock: {
    flex: 1,
    gap: spacing[1],
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  key: {
    ...typographyScale.sm,
    fontWeight: '700',
    fontFamily: 'Courier New',
  },
  secretBadge: {
    ...typographyScale.xs,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  value: {
    ...typographyScale.sm,
    flex: 1,
    fontFamily: 'Courier New',
  },
  comment: {
    ...typographyScale.xs,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingTop: spacing[1],
  },
  actionButton: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
