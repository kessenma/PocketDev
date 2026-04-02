import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import {
  ServerCard,
  ServerCardContent,
  ServerCardDescription,
  ServerCardHeader,
  ServerCardTitle,
} from './ServerCard'
import type { ServerQuickAction } from './model'

type Props = {
  actions: ServerQuickAction[]
  onRunAction: (actionId: string) => void
}

export default function ServerQuickActions({ actions, onRunAction }: Props) {
  const { colors } = useTheme()

  return (
    <ServerCard>
      <ServerCardHeader>
        <ServerCardTitle>Quick actions</ServerCardTitle>
        <ServerCardDescription>
          These are UI placeholders for the first commands you said you reach for when debugging the box.
        </ServerCardDescription>
      </ServerCardHeader>

      <ServerCardContent>
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
      </ServerCardContent>
    </ServerCard>
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
    ...typographyScale.base,
    fontWeight: '700',
  },
  command: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  description: {
    ...typographyScale.sm,
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  buttonText: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
})
