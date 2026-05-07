import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'

type Props = {
  canAccept: boolean
  isSubmitting: boolean
  onAccept: () => void
  onDeny: () => void
}

export default function PlanActionBar({ canAccept, isSubmitting, onAccept, onDeny }: Props) {
  const { colors } = useTheme()

  return (
    <Card>
      <CardContent>
        <View style={styles.row}>
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={isSubmitting}
            onPress={onDeny}
            style={[
              styles.button,
              styles.denyButton,
              { backgroundColor: colors.errorBackground, borderColor: colors.error },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.error} size="small" />
            ) : (
              <Text style={[styles.buttonText, { color: colors.error }]}>Deny Plan</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!canAccept || isSubmitting}
            onPress={onAccept}
            style={[
              styles.button,
              styles.acceptButton,
              { backgroundColor: canAccept ? colors.primary : colors.border },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primaryText} size="small" />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Accept Plan</Text>
            )}
          </TouchableOpacity>
        </View>
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  denyButton: {
    borderWidth: 1,
  },
  acceptButton: {},
  buttonText: {
    ...typeStyles.bodyBold,
  },
})
