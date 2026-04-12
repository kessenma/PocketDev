import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AlertTriangle, Bot, XCircle } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import type { GitMergeState } from '@pocketdev/shared/types'
import { useTheme } from '../../contexts/ThemeContext'
import { GitCard, GitCardContent, GitCardHeader, GitCardTitle } from './GitCard'
import GitBadge from './GitBadge'

type Props = {
  mergeState: GitMergeState
  isAborting: boolean
  onAbort: () => void
  onFixWithAI: () => void
}

export default function GitConflictPanel({ mergeState, isAborting, onAbort, onFixWithAI }: Props) {
  const { colors } = useTheme()

  if (!mergeState.inProgress) return null

  return (
    <GitCard>
      <GitCardHeader>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <View style={styles.titleLine}>
              <AlertTriangle color={colors.error} size={16} strokeWidth={2.5} />
              <GitCardTitle>Merge Conflict</GitCardTitle>
            </View>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Merging{mergeState.mergeBranch ? ` from ${mergeState.mergeBranch}` : ''} hit conflicts in{' '}
              {mergeState.conflictedPaths.length} file{mergeState.conflictedPaths.length !== 1 ? 's' : ''}.
            </Text>
          </View>
          <GitBadge variant="error">conflict</GitBadge>
        </View>
      </GitCardHeader>

      <GitCardContent>
        <View style={[styles.fileList, { backgroundColor: colors.backgroundSecondary }]}>
          {mergeState.conflictedPaths.map((path) => (
            <View key={path} style={styles.fileRow}>
              <View style={[styles.conflictDot, { backgroundColor: colors.error }]} />
              <Text style={[styles.filePath, { color: colors.text }]} numberOfLines={1}>
                {path}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={onFixWithAI}
          activeOpacity={0.7}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Bot color={colors.primaryText} size={16} strokeWidth={2.5} />
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Fix with AI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onAbort}
          disabled={isAborting}
          activeOpacity={0.7}
          style={[styles.button, { borderWidth: 1, borderColor: colors.error }]}
        >
          {isAborting
            ? <ActivityIndicator color={colors.error} size="small" />
            : (
              <>
                <XCircle color={colors.error} size={16} strokeWidth={2.5} />
                <Text style={[styles.buttonText, { color: colors.error }]}>Abort Merge</Text>
              </>
            )}
        </TouchableOpacity>
      </GitCardContent>
    </GitCard>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  titleBlock: {
    flex: 1,
    gap: spacing[1],
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  description: {
    ...typographyScale.sm,
  },
  fileList: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  conflictDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filePath: {
    ...typographyScale.sm,
    fontWeight: '500',
    flex: 1,
  },
  button: {
    minHeight: 48,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  buttonText: {
    ...typographyScale.base,
    fontWeight: '700',
  },
})
