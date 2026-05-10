import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import GitBadge from './primitives/GitBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import type { GitRemoteState } from './model'

type Props = {
  remote: GitRemoteState
  isPushing: boolean
  isPulling: boolean
  onPushPress: () => void
  onPullPress: () => void
}

export default function GitPushPanel({ remote, isPushing, isPulling, onPushPress, onPullPress }: Props) {
  const { colors } = useTheme()
  const canPush = !remote.requiresAuth && remote.behind === 0 && remote.ahead > 0 && !isPushing && !isPulling
  const canPull = !remote.requiresAuth && remote.behind > 0 && !isPulling && !isPushing
  const summary =
    remote.requiresAuth
      ? 'Authentication is still needed before git transport can run on the server.'
      : remote.behind > 0
        ? `Remote is ${remote.behind} commit${remote.behind !== 1 ? 's' : ''} ahead. Pull to update.`
        : remote.ahead > 0
          ? `${remote.ahead} local commits are ready to publish.`
          : 'Branch is already in sync with the remote.'

  return (
    <Card>
      <CardHeader>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <CardTitle>Push</CardTitle>
            <CardDescription>{summary}</CardDescription>
          </View>
          <GitBadge variant={statusVariant(remote.status)}>{remote.status}</GitBadge>
        </View>
      </CardHeader>

      <CardContent>
        <View style={[styles.metrics, { backgroundColor: colors.backgroundSecondary }]}> 
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Remote</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{remote.remote}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Ahead / Behind</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {remote.ahead} / {remote.behind}
            </Text>
          </View>
        </View>

        {canPull && (
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!canPull}
            onPress={onPullPress}
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            {isPulling ? (
              <ActivityIndicator color={colors.primaryText} size="small" />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Pull from {remote.upstream}</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          disabled={!canPush}
          onPress={onPushPress}
          style={[styles.button, { backgroundColor: canPush ? colors.primary : colors.border }]}
        >
          {isPushing ? (
            <ActivityIndicator color={colors.primaryText} size="small" />
          ) : (
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Push to {remote.upstream}</Text>
          )}
        </TouchableOpacity>
      </CardContent>
    </Card>
  )
}

function statusVariant(status: GitRemoteState['status']) {
  switch (status) {
    case 'ready':
      return 'primary'
    case 'pending':
      return 'warning'
    case 'blocked':
      return 'error'
    default:
      return 'success'
  }
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
  metrics: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    flexDirection: 'row',
    gap: spacing[3],
  },
  metricCell: {
    flex: 1,
    gap: spacing[1],
  },
  metricLabel: {
    ...typeStyles.sectionTitle,
  },
  metricValue: {
    ...typeStyles.bodyBold,
  },
  button: {
    minHeight: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...typeStyles.bodyBold,
  },
})