import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import ReanimatedLib from 'react-native-reanimated'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../../contexts/ThemeContext'
import { useFilesStore } from '../../../../stores/files'
import { usePreviewStore } from '../../../../stores/preview'
import type { useShrinkableHeader } from '../../../ui/ShrinkableHeader'
import { typeStyles } from '../../../../theme/typography'

type ContextViewProps = {
  scrollHandler: ReturnType<typeof useShrinkableHeader>['scrollHandler']
}

export default function ContextView({ scrollHandler }: ContextViewProps) {
  const { colors } = useTheme()
  const selectedContextPaths = useFilesStore((state) => state.selectedContextPaths)
  const clearContextPaths = useFilesStore((state) => state.clearContextPaths)
  const openPreview = usePreviewStore((state) => state.openPreview)

  return (
    <ReanimatedLib.ScrollView
      contentContainerStyle={styles.contextContent}
      showsVerticalScrollIndicator={false}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
    >
      <View style={[styles.contextTray, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.contextTrayHeader}>
          <Text style={[styles.contextTrayLabel, { color: colors.textTertiary }]}>AI Context</Text>
          {selectedContextPaths.length > 0 ? (
            <TouchableOpacity onPress={clearContextPaths} activeOpacity={0.7}>
              <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {selectedContextPaths.length > 0 ? (
          <View style={styles.contextChipRow}>
            {selectedContextPaths.map((path) => (
              <View key={path} style={[styles.contextChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.contextChipText, { color: colors.text }]} numberOfLines={1}>
                  {path}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyInlineText, { color: colors.textSecondary }]}>
            Pin files from the browser or code viewer, then ask AI with focused repo context.
          </Text>
        )}
      </View>

      <View style={[styles.contextTray, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.contextTrayLabel, { color: colors.textTertiary }]}>Preview</Text>
        <Text style={[styles.emptyInlineText, { color: colors.textSecondary }]}>
          Open the proxied browser preview for the active project when a local dev server is running.
        </Text>
        <TouchableOpacity
          onPress={() => {
            void openPreview()
          }}
          activeOpacity={0.7}
          style={[styles.primaryAction, styles.contextPreviewAction, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.primaryActionText, { color: colors.primaryText }]}>Open Preview</Text>
        </TouchableOpacity>
      </View>
    </ReanimatedLib.ScrollView>
  )
}

const styles = StyleSheet.create({
  contextContent: {
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  contextTray: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[3],
  },
  contextTrayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contextTrayLabel: {
    ...typeStyles.sectionTitle,
  },
  clearText: {
    ...typeStyles.bodySmall,
  },
  contextChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  contextChip: {
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  contextChipText: {
    ...typeStyles.meta,
    maxWidth: 260,
  },
  emptyInlineText: {
    ...typeStyles.bodySmall,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  contextPreviewAction: {
    alignSelf: 'flex-start',
  },
  primaryActionText: {
    ...typeStyles.bodySmall,
  },
})
