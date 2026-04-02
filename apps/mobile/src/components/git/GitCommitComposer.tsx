import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { GitCard, GitCardContent, GitCardDescription, GitCardHeader, GitCardTitle } from './GitCard'

type Props = {
  value: string
  canCommit: boolean
  isCommitting: boolean
  onChangeText: (value: string) => void
  onCommitPress: () => void
}

export default function GitCommitComposer({ value, canCommit, isCommitting, onChangeText, onCommitPress }: Props) {
  const { colors } = useTheme()

  return (
    <GitCard>
      <GitCardHeader>
        <GitCardTitle>Commit</GitCardTitle>
        <GitCardDescription>Draft the message you want to send once server-side git execution is wired in.</GitCardDescription>
      </GitCardHeader>

      <GitCardContent>
        <TextInput
          multiline
          value={value}
          onChangeText={onChangeText}
          placeholder="shape mobile git workflow"
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          textAlignVertical="top"
        />

        <View style={styles.footerRow}>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>Actions are local for now, but the commit composer already matches the future terminal-backed flow.</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!canCommit || isCommitting}
            onPress={onCommitPress}
            style={[
              styles.button,
              { backgroundColor: canCommit ? colors.primary : colors.border },
            ]}
          >
            {isCommitting ? (
              <ActivityIndicator color={colors.primaryText} size="small" />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Create Commit</Text>
            )}
          </TouchableOpacity>
        </View>
      </GitCardContent>
    </GitCard>
  )
}

const styles = StyleSheet.create({
  input: {
    ...typographyScale.base,
    minHeight: 116,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  footerRow: {
    gap: spacing[3],
  },
  helper: {
    ...typographyScale.sm,
  },
  button: {
    minHeight: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  buttonText: {
    ...typographyScale.base,
    fontWeight: '700',
  },
})