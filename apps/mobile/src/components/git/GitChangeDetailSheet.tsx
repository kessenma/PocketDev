import React, { useRef } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Sheet, type SheetHandle } from '../ui/Sheet'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import type { GitFileChange } from './model'
import GitDiffPreview from './GitDiffPreview'

type Props = {
  change: GitFileChange | null
  onDismiss: () => void
}

export default function GitChangeDetailSheet({ change, onDismiss }: Props) {
  const { colors } = useTheme()
  const sheetRef = useRef<SheetHandle>(null)

  return (
    <Sheet
      ref={sheetRef}
      detents={[0.6, 1]}
      onDismiss={onDismiss}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.text }]}>Changed File</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {change?.path ?? 'Select a file to inspect the diff and source.'}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => sheetRef.current?.dismiss()}
          style={[styles.doneButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
        >
          <Text style={[styles.doneButtonText, { color: colors.text }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <GitDiffPreview change={change} variant="plain" />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  headerCopy: {
    flex: 1,
    gap: spacing[1],
  },
  title: {
    ...typeStyles.heading,
  },
  subtitle: {
    ...typeStyles.bodySmall,
  },
  doneButton: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  doneButtonText: {
    ...typeStyles.bodySmall,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
})
