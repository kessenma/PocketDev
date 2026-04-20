import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { EnrichedMarkdownText } from 'react-native-enriched-markdown'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import { buildMarkdownStyle } from '../../theme/markdown'
import PlanBadge from './PlanBadge'
import { PlanCard, PlanCardContent, PlanCardDescription, PlanCardHeader, PlanCardTitle } from './PlanCard'
import type { PlanStep, PlanStepKind } from './model'

type Props = {
  steps: PlanStep[]
}

const KIND_VARIANT: Record<PlanStepKind, 'primary' | 'success' | 'error' | 'warning' | 'neutral'> = {
  create: 'success',
  modify: 'primary',
  delete: 'error',
  run: 'warning',
  note: 'neutral',
}

export default function PlanStepList({ steps }: Props) {
  const { colors } = useTheme()

  return (
    <PlanCard>
      <PlanCardHeader>
        <PlanCardTitle>Steps</PlanCardTitle>
        <PlanCardDescription>{steps.length} steps in this plan</PlanCardDescription>
      </PlanCardHeader>

      <PlanCardContent>
        {steps.map((step, index) => (
          <View
            key={step.id}
            style={[styles.stepRow, { backgroundColor: colors.backgroundSecondary }]}
          >
            <View style={styles.stepHeader}>
              <Text style={[styles.stepNumber, { color: colors.textTertiary }]}>{index + 1}</Text>
              <View style={styles.stepTitleBlock}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
                {step.filePath ? (
                  <Text style={[styles.filePath, { color: colors.primary }]}>{step.filePath}</Text>
                ) : null}
              </View>
              <PlanBadge variant={KIND_VARIANT[step.kind]}>{step.kind}</PlanBadge>
            </View>
            <EnrichedMarkdownText
              markdown={step.description}
              markdownStyle={buildMarkdownStyle(colors)}
            />
          </View>
        ))}
      </PlanCardContent>
    </PlanCard>
  )
}

const styles = StyleSheet.create({
  stepRow: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  stepNumber: {
    ...typeStyles.bodySmall,
    fontWeight: '700',
    minWidth: 20,
  },
  stepTitleBlock: {
    flex: 1,
    gap: spacing[1],
  },
  stepTitle: {
    ...typeStyles.button,
  },
  filePath: {
    ...typeStyles.meta,
  },
})
