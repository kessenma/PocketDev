import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import type { OpenCodeWizardStep, OpenCodeWizardStepStatus } from '@pocketdev/shared/types'

const STEPS: Array<{ id: OpenCodeWizardStep; label: string }> = [
  { id: 'review', label: 'Review' },
  { id: 'install', label: 'Install' },
  { id: 'verify', label: 'Verify' },
]

interface Props {
  currentStep: OpenCodeWizardStep
  stepStatuses: Record<OpenCodeWizardStep, OpenCodeWizardStepStatus>
}

export default function WizardStepper({ currentStep, stepStatuses }: Props) {
  const { colors } = useTheme()

  return (
    <View style={styles.container}>
      {STEPS.map((step) => {
        const status = stepStatuses[step.id]
        const active = currentStep === step.id
        const complete = status === 'completed' || status === 'skipped'
        const backgroundColor = active ? colors.primary : complete ? `${colors.primary}22` : colors.surface
        const textColor = active ? colors.primaryText : colors.textSecondary

        return (
          <View key={step.id} style={[styles.pill, { backgroundColor, borderColor: colors.border }]}>
            <Text style={[styles.pillText, { color: textColor }]}>{step.label}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  pill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  pillText: {
    ...typographyScale.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
})
