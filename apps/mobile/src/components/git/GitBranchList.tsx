import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import GitBadge from './GitBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import type { GitBranchOption } from './model'

type Props = {
  branches: GitBranchOption[]
  onSelectBranch: (branchName: string) => void
}

export default function GitBranchList({ branches, onSelectBranch }: Props) {
  const { colors } = useTheme()
  const currentBranch = branches.find((branch) => branch.current) ?? null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branch Switcher</CardTitle>
        <CardDescription>Switch branches here, then review changes and history in the other git views.</CardDescription>
      </CardHeader>

      <CardContent>
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
      </CardContent>
    </Card>
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
    ...typeStyles.sectionTitle,
  },
  currentBranchName: {
    ...typeStyles.bodyBold,
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
    ...typeStyles.bodyBold,
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  description: {
    ...typeStyles.bodySmall,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  meta: {
    ...typeStyles.meta,
  },
  switchLabel: {
    ...typeStyles.meta,
  },
})
