import React from 'react'
import { StyleSheet, TextInput } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'

type Props = {
  value: string
  onChangeText: (text: string) => void
}

export default function PlanNotes({ value, onChangeText }: Props) {
  const { colors } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Notes</CardTitle>
        <CardDescription>Add annotations or edits for the agent to consider.</CardDescription>
      </CardHeader>

      <CardContent>
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
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  input: {
    ...typeStyles.body,
    minHeight: 116,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
})
