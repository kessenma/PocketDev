import React from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { FilePlus } from 'lucide-react-native'
import { typeStyles } from '../../../theme/typography'
import { useTheme } from '../../../contexts/ThemeContext'
import { Button } from '../../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/Card'

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
    <Card>
      <CardHeader>
        <CardTitle>Commit</CardTitle>
        <CardDescription>Draft the message you want to send once server-side git execution is wired in.</CardDescription>
      </CardHeader>

      <CardContent>
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
          <Button
            disabled={!canCommit}
            loading={isCommitting}
            onPress={onCommitPress}
            leftIcon={FilePlus}
          >
            Create Commit
          </Button>
        </View>
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
  footerRow: {
    gap: spacing[3],
  },
  helper: {
    ...typeStyles.bodySmall,
  },
})
