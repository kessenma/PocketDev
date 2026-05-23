import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Eye, EyeOff, Play } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { typeStyles } from '../../../theme/typography'
import { useServerActionsStore } from '../../../stores/server-actions'
import { Button } from '../../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/Card'
import QuickActionOutputView from './QuickActionOutputView'
import type { ServerQuickAction } from '../../server-actions/model'

type Props = {
  actions: ServerQuickAction[]
}

export default function ServerQuickActionsCard({ actions }: Props) {
  const { colors } = useTheme()
  const previewResults = useServerActionsStore((s) => s.previewResults)
  const previewAction = useServerActionsStore((s) => s.previewAction)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  function handleEye(actionId: string) {
    const result = previewResults[actionId]
    if (!result) {
      setExpanded((prev) => ({ ...prev, [actionId]: true }))
      previewAction(actionId)
    } else {
      setExpanded((prev) => ({ ...prev, [actionId]: !prev[actionId] }))
    }
  }

  return (
    <Card accentColor={colors.bracketAccent}>
      <CardHeader>
        <CardTitle icon={<Play size={16} color={colors.textSecondary} strokeWidth={2} />}>
          Quick checks
        </CardTitle>
        <CardDescription>
          Preview common workspace diagnostics and environment checks from one place.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {actions.map((action) => {
          const result = previewResults[action.id]
          const isLoading = result?.status === 'loading'
          const isExpanded = expanded[action.id] ?? false
          const showOutput = isExpanded && result && result.status !== 'loading'

          return (
            <View
              key={action.id}
              style={[styles.row, { backgroundColor: colors.backgroundSecondary }]}
            >
              <View style={styles.rowHeader}>
                <View style={styles.copy}>
                  <Text style={[styles.label, { color: colors.text }]}>{action.label}</Text>
                  <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {action.description}
                  </Text>
                </View>
                <Button
                  icon={isExpanded && result && !isLoading ? EyeOff : Eye}
                  variant="quiet"
                  size="sm"
                  loading={isLoading}
                  onPress={() => handleEye(action.id)}
                />
              </View>

              {showOutput && (
                result.status === 'ok' ? (
                  <QuickActionOutputView output={result.output} exitCode={result.exitCode} />
                ) : (
                  <View style={[styles.errorBox, { backgroundColor: colors.panel, borderColor: colors.border }]}>
                    <Text style={[styles.errorText, { color: colors.accentRed ?? '#dc2626' }]} selectable>
                      {result.message}
                    </Text>
                  </View>
                )
              )}
            </View>
          )
        })}
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  row: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  copy: {
    flex: 1,
    gap: spacing[1],
  },
  label: {
    ...typeStyles.bodyBold,
  },
  description: {
    ...typeStyles.bodySmall,
  },
  errorBox: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing[3],
  },
  errorText: {
    ...typeStyles.mono,
  },
})
