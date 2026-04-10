import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import GitBadge from './GitBadge'
import { GitCard, GitCardContent, GitCardDescription, GitCardHeader, GitCardTitle } from './GitCard'
import type { GitBranchOption } from './model'

type Props = {
  branches: GitBranchOption[]
  onSelectBranch: (branchName: string) => void
}

export default function GitBranchList({ branches, onSelectBranch }: Props) {
  const { colors } = useTheme()
  const currentBranch = branches.find((branch) => branch.current) ?? null

  return (
    <GitCard>
      <GitCardHeader>
        <GitCardTitle>Branch Switcher</GitCardTitle>
        <GitCardDescription>Switch branches here, then review changes and history in the other git views.</GitCardDescription>
      </GitCardHeader>

      <GitCardContent>
        {currentBranch ? (
          <View style={[styles.currentBranchCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <Text style={[styles.currentBranchLabel, { color: colors.textTertiary }]}>Current branch</Text>
            <Text style={[styles.currentBranchName, { color: colors.text }]}>{currentBranch.name}</Text>
            <Text style={[styles.meta, { color: colors.textTertiary }]}>
              ahead {currentBranch.ahead} · behind {currentBranch.behind}
            </Text>
          </View>
        ) : null}

        {branches.map((branch) => (
          <TouchableOpacity
            key={branch.name}
            activeOpacity={0.7}
            onPress={() => onSelectBranch(branch.name)}
            style={[
              styles.row,
              {
                backgroundColor: branch.current ? colors.primary + '12' : colors.backgroundSecondary,
                borderColor: branch.current ? colors.primary : 'transparent',
              },
            ]}
          >
            <View style={styles.rowHeader}>
              <Text style={[styles.name, { color: colors.text }]}>{branch.name}</Text>
              <View style={styles.badges}>
                {branch.protected ? <GitBadge variant="primary">protected</GitBadge> : null}
                {branch.current ? <GitBadge variant="success">current</GitBadge> : null}
              </View>
            </View>

            <Text style={[styles.description, { color: colors.textSecondary }]}>{branch.description}</Text>

            <View style={styles.rowFooter}>
              <Text style={[styles.meta, { color: colors.textTertiary }]}>
                ahead {branch.ahead} · behind {branch.behind}
              </Text>
              {!branch.current ? (
                <Text style={[styles.switchLabel, { color: colors.primary }]}>Switch</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </GitCardContent>
    </GitCard>
  )
}

const styles = StyleSheet.create({
  currentBranchCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[1],
  },
  currentBranchLabel: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  currentBranchName: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  row: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  name: {
    ...typographyScale.base,
    fontWeight: '700',
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  description: {
    ...typographyScale.sm,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  meta: {
    ...typographyScale.xs,
    fontWeight: '600',
  },
  switchLabel: {
    ...typographyScale.xs,
    fontWeight: '700',
  },
})
