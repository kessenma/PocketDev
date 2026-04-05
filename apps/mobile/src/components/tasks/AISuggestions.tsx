import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Cpu, PinIcon } from 'lucide-react-native'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useOnDeviceAIStore } from '../../stores/on-device-ai'
import { useFilesStore } from '../../stores/files'
import BauhausBadge from '../shared/BauhausBadge'
import { pathToName } from '../files/model'
import { typeStyles } from '../../theme/typography'

export default function AISuggestions() {
  const { colors } = useTheme()
  const suggestions = useOnDeviceAIStore((s) => s.suggestions)
  const clearSuggestions = useOnDeviceAIStore((s) => s.clearSuggestions)
  const toggleContextPath = useFilesStore((s) => s.toggleContextPath)
  const selectedContextPaths = useFilesStore((s) => s.selectedContextPaths)

  // Filter out already-pinned files
  const visible = suggestions.filter((s) => !selectedContextPaths.includes(s.path))

  if (visible.length === 0) return null

  function handleTap(path: string) {
    toggleContextPath(path)
  }

  function handlePinAll() {
    for (const s of visible) {
      toggleContextPath(s.path)
    }
  }

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.panelAlt }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Cpu color={colors.primary} size={14} strokeWidth={2.2} />
          <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>Suggested files</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handlePinAll} activeOpacity={0.7}>
            <Text style={[styles.actionText, { color: colors.primary }]}>Pin all</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearSuggestions} activeOpacity={0.7}>
            <Text style={[styles.actionText, { color: colors.textTertiary }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.chipRow}>
        {visible.map((suggestion) => (
          <TouchableOpacity
            key={suggestion.path}
            style={[styles.chip, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]}
            onPress={() => handleTap(suggestion.path)}
            activeOpacity={0.7}
          >
            <PinIcon color={colors.primary} size={12} strokeWidth={2.2} />
            <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>
              {pathToName(suggestion.path)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  headerLabel: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  actionText: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipText: {
    ...typeStyles.meta,
    fontWeight: '600',
    flexShrink: 1,
  },
})
