import React from 'react'
import { StyleSheet, TextInput } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { PlanCard, PlanCardContent, PlanCardDescription, PlanCardHeader, PlanCardTitle } from './PlanCard'

type Props = {
  value: string
  onChangeText: (text: string) => void
}

export default function PlanNotes({ value, onChangeText }: Props) {
  const { colors } = useTheme()

  return (
    <PlanCard>
      <PlanCardHeader>
        <PlanCardTitle>Your Notes</PlanCardTitle>
        <PlanCardDescription>Add annotations or edits for the agent to consider.</PlanCardDescription>
      </PlanCardHeader>

      <PlanCardContent>
        <TextInput
          multiline
          value={value}
          onChangeText={onChangeText}
          placeholder="Add notes, suggestions, or edits..."
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
      </PlanCardContent>
    </PlanCard>
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
})
