import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import type { RootStackParamList } from '../../navigation/types'
import GitBadge from './GitBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import type { GitCommitEntry } from './model'

type Props = {
  commits: GitCommitEntry[]
}

export default function GitHistoryList({ commits }: Props) {
  const { colors } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Commits</CardTitle>
      </CardHeader>

      <CardContent>
        {commits.map((commit) => (
          <View key={commit.id} style={[styles.row, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.rowHeader}>
              <GitBadge variant="outline">{commit.sha}</GitBadge>
              <Text style={[styles.time, { color: colors.textTertiary }]}>{commit.relativeTime}</Text>
            </View>
            <Text style={[styles.message, { color: colors.text }]}>{commit.message}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {commit.author} · {commit.filesChanged} files changed
            </Text>
          </View>
        ))}

        <Pressable
          onPress={() => navigation.navigate('GitHistory')}
          style={({ pressed }) => [styles.viewAll, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>View Full History →</Text>
        </Pressable>
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  row: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    ...typeStyles.meta,
  },
  message: {
    ...typeStyles.bodySmall,
  },
  meta: {
    ...typeStyles.meta,
  },
  viewAll: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  viewAllText: {
    ...typeStyles.bodySmall,
  },
})