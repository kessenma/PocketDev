import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Terminal } from 'lucide-react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import CopyButton from '../../shared/CopyButton'

interface Props {
  description: React.ReactNode
  commands: string[]
}

export default function SetupCommandCard({ description, commands }: Props) {
  const { colors } = useTheme()

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.infoText, { color: colors.textSecondary }]}>{description}</Text>
      <View style={styles.commandList}>
        {commands.map((command) => (
          <View key={command} style={[styles.commandRow, { backgroundColor: colors.background }]}>
            <View style={styles.commandTextWrap}>
              <Terminal color={colors.textTertiary} size={14} strokeWidth={2.1} />
              <Text style={[styles.commandText, { color: colors.textTertiary }]}>$ {command}</Text>
            </View>
            <CopyButton value={command} label="Copy command" style={styles.copyButton} />
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  infoText: {
    ...typographyScale.sm,
    lineHeight: 20,
  },
  commandList: {
    gap: spacing[2],
  },
  commandRow: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[2],
  },
  commandTextWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  commandText: {
    ...typographyScale.xs,
    fontFamily: 'monospace',
    flex: 1,
  },
  copyButton: {
    alignSelf: 'flex-start',
  },
})
