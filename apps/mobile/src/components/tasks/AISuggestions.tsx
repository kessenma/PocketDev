import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronDown, ChevronUp, Cpu, Filter, Image as ImageIcon } from 'lucide-react-native'
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons'
import { spacing, borderRadius } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useOnDeviceAIStore } from '../../stores/on-device-ai'
import { useFilesStore } from '../../stores/files'
import { getFileKind, getExtension, type FileKind } from '../../services/file-context-suggester'
import type { FileSuggestion } from '../../services/file-context-suggester'
import { pathToName } from '../files/model'
import { typeStyles } from '../../theme/typography'

// Extensions with MDI icons
type ExtIconInfo = { mdi: string; color: string } | { lucide: 'image' | 'apple'; color: string }

const EXT_ICONS: Record<string, ExtIconInfo> = {
  ts:    { mdi: 'language-typescript',  color: '#3178C6' },
  tsx:   { mdi: 'language-typescript',  color: '#3178C6' },
  js:    { mdi: 'language-javascript',  color: '#D4A017' },
  jsx:   { mdi: 'language-javascript',  color: '#D4A017' },
  swift: { mdi: 'language-swift',       color: '#F05138' },
  kt:    { mdi: 'language-kotlin',      color: '#7F52FF' },
  rs:    { mdi: 'language-rust',        color: '#A0522D' },
  py:    { mdi: 'language-python',      color: '#3776AB' },
  go:    { mdi: 'language-go',          color: '#00ADD8' },
  rb:    { mdi: 'language-ruby',        color: '#CC342D' },
  java:  { mdi: 'language-java',        color: '#5382A1' },
  html:  { mdi: 'language-html5',       color: '#E34F26' },
  css:   { mdi: 'language-css3',        color: '#663399' },
  scss:  { mdi: 'language-css3',        color: '#663399' },
  md:    { mdi: 'language-markdown',    color: '#757575' },
  json:  { mdi: 'code-json',           color: '#757575' },
  yaml:  { mdi: 'file-cog-outline',    color: '#757575' },
  yml:   { mdi: 'file-cog-outline',    color: '#757575' },
  sql:   { mdi: 'database',            color: '#336791' },
  sh:    { mdi: 'console',             color: '#4EAA25' },
  bat:   { mdi: 'console',             color: '#4EAA25' },
  gradle:{ mdi: 'elephant',            color: '#02303A' },
  // Image files — use lucide Image icon
  png:   { lucide: 'image', color: '#8B6914' },
  jpg:   { lucide: 'image', color: '#8B6914' },
  jpeg:  { lucide: 'image', color: '#8B6914' },
  gif:   { lucide: 'image', color: '#8B6914' },
  svg:   { lucide: 'image', color: '#8B6914' },
  webp:  { lucide: 'image', color: '#8B6914' },
  ico:   { lucide: 'image', color: '#8B6914' },
  // Xcode / Apple files
  pbxproj:         { lucide: 'apple', color: '#A2AAAD' },
  xcworkspacedata: { lucide: 'apple', color: '#A2AAAD' },
  xcprivacy:       { lucide: 'apple', color: '#A2AAAD' },
  plist:           { lucide: 'apple', color: '#A2AAAD' },
  storyboard:      { lucide: 'apple', color: '#A2AAAD' },
  // Android
  keystore:   { mdi: 'android', color: '#3DDC84' },
  properties: { mdi: 'android', color: '#3DDC84' },
  pro:        { mdi: 'android', color: '#3DDC84' },
}

function getExtColor(ext: string): string {
  return EXT_ICONS[ext]?.color ?? '#757575'
}

function renderExtIcon(ext: string, size: number, color: string) {
  const info = EXT_ICONS[ext]
  if (!info) return null
  if ('mdi' in info) return <MaterialDesignIcons name={info.mdi} size={size} color={color} />
  if (info.lucide === 'image') return <ImageIcon color={color} size={size} strokeWidth={2.2} />
  if (info.lucide === 'apple') return <MaterialDesignIcons name="apple" size={size} color={color} />
  return null
}

function SuggestionChip({ suggestion, onPress }: { suggestion: FileSuggestion; onPress: () => void }) {
  const ext = getExtension(suggestion.path)
  const color = getExtColor(ext)

  return (
    <TouchableOpacity
      style={[styles.chip, { borderColor: color + '40', backgroundColor: color + '0D' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {renderExtIcon(ext, 14, color)}
      <Text style={[styles.chipText, { color }]} numberOfLines={1}>
        {ext ? pathToName(suggestion.path).replace(`.${ext}`, '') : pathToName(suggestion.path)}
      </Text>
      {ext ? <Text style={[styles.extLabel, { color: color + 'AA', textDecorationLine: 'underline' }]}>.{ext}</Text> : null}
    </TouchableOpacity>
  )
}

function ExtensionFilterRow() {
  const { colors } = useTheme()
  const availableExtensions = useOnDeviceAIStore((s) => s.availableExtensions)
  const extensionFilter = useOnDeviceAIStore((s) => s.extensionFilter)
  const setExtensionFilter = useOnDeviceAIStore((s) => s.setExtensionFilter)
  const [showFilter, setShowFilter] = React.useState(false)

  if (availableExtensions.length === 0) return null

  const filterActive = extensionFilter.length > 0

  function toggleExt(ext: string) {
    if (extensionFilter.includes(ext)) {
      setExtensionFilter(extensionFilter.filter((e) => e !== ext))
    } else {
      setExtensionFilter([...extensionFilter, ext])
    }
  }

  return (
    <>
      <TouchableOpacity
        style={styles.filterToggle}
        onPress={() => setShowFilter((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Filter color={filterActive ? colors.primary : colors.textTertiary} size={12} strokeWidth={2.2} />
        <Text style={[styles.filterToggleText, { color: filterActive ? colors.primary : colors.textTertiary }]}>
          {filterActive ? `Filter: ${extensionFilter.map((e) => `.${e}`).join(', ')}` : 'Filter by type'}
        </Text>
        {showFilter
          ? <ChevronUp color={colors.textTertiary} size={12} strokeWidth={2.2} />
          : <ChevronDown color={colors.textTertiary} size={12} strokeWidth={2.2} />}
      </TouchableOpacity>

      {showFilter && (
        <View style={styles.filterGrid}>
          {filterActive && (
            <TouchableOpacity
              style={[styles.filterChip, { backgroundColor: colors.error + '18', borderColor: colors.error + '40' }]}
              onPress={() => setExtensionFilter([])}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, { color: colors.error }]}>Clear</Text>
            </TouchableOpacity>
          )}
          {availableExtensions.map((ext) => {
            const selected = extensionFilter.includes(ext)
            const chipColor = getExtColor(ext)
            return (
              <TouchableOpacity
                key={ext}
                style={[
                  styles.filterChip,
                  {
                    borderColor: selected ? chipColor + '60' : colors.border,
                    backgroundColor: selected ? chipColor + '15' : 'transparent',
                  },
                ]}
                onPress={() => toggleExt(ext)}
                activeOpacity={0.7}
              >
                {renderExtIcon(ext, 12, selected ? chipColor : colors.textTertiary)}
                <Text style={[styles.filterChipText, { color: selected ? chipColor : colors.textSecondary }]}>.{ext}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </>
  )
}

export default function AISuggestions() {
  const { colors } = useTheme()
  const suggestions = useOnDeviceAIStore((s) => s.suggestions)
  const restSuggestions = useOnDeviceAIStore((s) => s.restSuggestions)
  const extensionFilter = useOnDeviceAIStore((s) => s.extensionFilter)
  const clearSuggestions = useOnDeviceAIStore((s) => s.clearSuggestions)
  const toggleContextPath = useFilesStore((s) => s.toggleContextPath)
  const selectedContextPaths = useFilesStore((s) => s.selectedContextPaths)
  const [expanded, setExpanded] = React.useState(false)

  const filterSet = extensionFilter.length > 0 ? new Set(extensionFilter) : null

  const visibleTop = suggestions.filter((s) =>
    !selectedContextPaths.includes(s.path) && (!filterSet || filterSet.has(getExtension(s.path)))
  )
  const visibleRest = restSuggestions.filter((s) =>
    !selectedContextPaths.includes(s.path) && (!filterSet || filterSet.has(getExtension(s.path)))
  )

  if (visibleTop.length === 0 && visibleRest.length === 0) return null

  function handlePinAll() {
    for (const s of visibleTop) {
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
          {visibleTop.length > 0 && (
            <TouchableOpacity onPress={handlePinAll} activeOpacity={0.7}>
              <Text style={[styles.actionText, { color: colors.primary }]}>Pin all</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearSuggestions} activeOpacity={0.7}>
            <Text style={[styles.actionText, { color: colors.textTertiary }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ExtensionFilterRow />

      {visibleTop.length > 0 && (
        <View style={styles.chipRow}>
          {visibleTop.map((suggestion) => (
            <SuggestionChip
              key={suggestion.path}
              suggestion={suggestion}
              onPress={() => toggleContextPath(suggestion.path)}
            />
          ))}
        </View>
      )}

      {visibleRest.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.expandRow}
            onPress={() => setExpanded((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={[styles.expandText, { color: colors.textTertiary }]}>
              {expanded ? 'Hide' : 'Show'} {visibleRest.length} more
            </Text>
            {expanded
              ? <ChevronUp color={colors.textTertiary} size={14} strokeWidth={2.2} />
              : <ChevronDown color={colors.textTertiary} size={14} strokeWidth={2.2} />}
          </TouchableOpacity>

          {expanded && (
            <View style={styles.chipRow}>
              {visibleRest.map((suggestion) => (
                <SuggestionChip
                  key={suggestion.path}
                  suggestion={suggestion}
                  onPress={() => toggleContextPath(suggestion.path)}
                />
              ))}
            </View>
          )}
        </>
      )}
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
    textTransform: 'none',
    flexShrink: 1,
  },
  extLabel: {
    ...typeStyles.meta,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'none',
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
  },
  expandText: {
    ...typeStyles.meta,
    fontWeight: '600',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
  },
  filterToggleText: {
    ...typeStyles.meta,
    fontWeight: '600',
    flex: 1,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    ...typeStyles.meta,
    fontSize: 11,
    fontWeight: '600',
  },
})
