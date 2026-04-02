import React from 'react'
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import type { ContainerLogsDirection, ContainerLogsFilter, ContainerLogLine, ContainerSummary } from './model'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import ContainerBadge from './ContainerBadge'
import {
  ContainerCard,
  ContainerCardContent,
  ContainerCardDescription,
  ContainerCardHeader,
  ContainerCardTitle,
} from './ContainerCard'
import ContainerSegmentedControl from './ContainerSegmentedControl'

const DIRECTION_OPTIONS = [
  { value: 'tail', label: 'From End' },
  { value: 'head', label: 'From Start' },
] as const

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Lines' },
  { value: 'errors', label: 'Errors Only' },
] as const

type Props = {
  container: ContainerSummary | null
  lineCountInput: string
  direction: ContainerLogsDirection
  filter: ContainerLogsFilter
  logs: ContainerLogLine[]
  isLoading: boolean
  isFollowing: boolean
  error: string | null
  onLineCountChange: (value: string) => void
  onDirectionChange: (direction: ContainerLogsDirection) => void
  onFilterChange: (filter: ContainerLogsFilter) => void
  onRefreshLogs: () => void
  onToggleFollow: () => void
}

export default function ContainerLogsPanel({
  container,
  lineCountInput,
  direction,
  filter,
  logs,
  isLoading,
  isFollowing,
  error,
  onLineCountChange,
  onDirectionChange,
  onFilterChange,
  onRefreshLogs,
  onToggleFollow,
}: Props) {
  const { colors } = useTheme()
  const scrollRef = React.useRef<ScrollView>(null)

  React.useEffect(() => {
    if (!isFollowing) return
    scrollRef.current?.scrollToEnd({ animated: false })
  }, [logs, isFollowing])

  if (!container) {
    return (
      <ContainerCard style={styles.emptyCard}>
        <ContainerCardHeader>
          <ContainerCardTitle>Select a container</ContainerCardTitle>
          <ContainerCardDescription>Choose a Docker container to load logs, filter errors, or follow live output.</ContainerCardDescription>
        </ContainerCardHeader>
      </ContainerCard>
    )
  }

  return (
    <ContainerCard style={styles.card}>
      <ContainerCardHeader>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <ContainerCardTitle>{container.name}</ContainerCardTitle>
            <ContainerCardDescription>{container.image}</ContainerCardDescription>
          </View>
          <ContainerBadge variant={container.state === 'running' ? 'success' : container.state === 'restarting' ? 'warning' : 'outline'}>
            {container.state}
          </ContainerBadge>
        </View>
      </ContainerCardHeader>

      <ContainerCardContent>
        <View style={styles.controls}>
          <View style={styles.inputBlock}>
            <Text style={[styles.controlLabel, { color: colors.textTertiary }]}>Line Count</Text>
            <TextInput
              value={lineCountInput}
              onChangeText={onLineCountChange}
              keyboardType="number-pad"
              placeholder="100"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>

          <View style={styles.segmentBlock}>
            <Text style={[styles.controlLabel, { color: colors.textTertiary }]}>Read From</Text>
            <ContainerSegmentedControl
              value={direction}
              options={DIRECTION_OPTIONS}
              onChange={(value) => onDirectionChange(value as ContainerLogsDirection)}
            />
          </View>

          <View style={styles.segmentBlock}>
            <Text style={[styles.controlLabel, { color: colors.textTertiary }]}>Filter</Text>
            <ContainerSegmentedControl
              value={filter}
              options={FILTER_OPTIONS}
              onChange={(value) => onFilterChange(value as ContainerLogsFilter)}
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRefreshLogs}
            disabled={isLoading}
            style={[styles.secondaryButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Load Logs</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onToggleFollow}
            style={[styles.primaryButton, { backgroundColor: isFollowing ? colors.error : colors.primary }]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>
              {isFollowing ? 'Stop Follow' : 'Follow Live'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.helper, { color: colors.textSecondary }]}>
          Use snapshot mode for bounded reads. Use follow mode for live tailing after the initial head or tail snapshot.
        </Text>

        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorBackground }]}> 
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.logSurface, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}> 
          <ScrollView ref={scrollRef} contentContainerStyle={styles.logContent}>
            {logs.length > 0 ? (
              logs.map((line, index) => (
                <Text
                  key={`${index}-${line.content}`}
                  style={[
                    styles.logLine,
                    { color: line.is_error ? colors.error : colors.text },
                  ]}
                >
                  {line.content}
                </Text>
              ))
            ) : (
              <Text style={[styles.emptyLogs, { color: colors.textSecondary }]}>No logs loaded yet.</Text>
            )}
          </ScrollView>
        </View>
      </ContainerCardContent>
    </ContainerCard>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  emptyCard: {
    minHeight: 320,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  headerText: {
    flex: 1,
    gap: spacing[1],
  },
  controls: {
    gap: spacing[3],
  },
  inputBlock: {
    gap: spacing[2],
  },
  segmentBlock: {
    gap: spacing[2],
  },
  controlLabel: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    ...typographyScale.base,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  secondaryButtonText: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  primaryButtonText: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  helper: {
    ...typographyScale.sm,
  },
  errorBanner: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  errorText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  logSurface: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 280,
    maxHeight: 520,
  },
  logContent: {
    padding: spacing[3],
    gap: spacing[2],
  },
  logLine: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyLogs: {
    ...typographyScale.sm,
  },
})