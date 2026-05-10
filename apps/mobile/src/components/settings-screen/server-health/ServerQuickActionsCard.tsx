import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Play } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { typeStyles } from '../../../theme/typography'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/Card'
import type { ServerQuickAction } from '../../server-actions/model'

type Props = {
  actions: ServerQuickAction[]
  onRunAction: (actionId: string) => void
}

export default function ServerQuickActionsCard({ actions, onRunAction }: Props) {
  const { colors } = useTheme()

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
        {actions.map((action) => (
          <View
            key={action.id}
            style={[styles.row, { backgroundColor: colors.backgroundSecondary }]}
          >
            <View style={styles.copy}>
              <Text style={[styles.label, { color: colors.text }]}>{action.label}</Text>
              <Text style={[styles.command, { color: colors.primary }]}>{action.command}</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {action.description}
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={() => onRunAction(action.id)}
              style={[styles.button, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Preview</Text>
            </TouchableOpacity>
          </View>
        ))}
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
  copy: {
    gap: spacing[1],
  },
  label: {
    ...typeStyles.bodyBold,
  },
  command: {
    ...typeStyles.bodySmall,
  },
  description: {
    ...typeStyles.bodySmall,
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  buttonText: {
    ...typeStyles.bodySmall,
  },
})
