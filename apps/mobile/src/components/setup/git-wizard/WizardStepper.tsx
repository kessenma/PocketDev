import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../../theme/typography'
import { Check, Minus, X } from 'lucide-react-native'
import type { GitWizardStep, GitWizardStepStatus } from '@pocketdev/shared/types'

const VISIBLE_STEPS: { key: GitWizardStep; label: string }[] = [
  { key: 'install', label: 'Install' },
  { key: 'install-gh', label: 'GH CLI' },
  { key: 'github-cli-auth', label: 'Auth' },
  { key: 'configure-identity', label: 'Identity' },
]

interface Props {
  currentStep: GitWizardStep
  stepStatuses: Record<GitWizardStep, GitWizardStepStatus>
}

export default function WizardStepper({ currentStep, stepStatuses }: Props) {
  const { colors } = useTheme()

  return (
    <View style={styles.container}>
      {VISIBLE_STEPS.map((step, index) => {
        const status = stepStatuses[step.key]
        const isActive = currentStep === step.key
        const isLast = index === VISIBLE_STEPS.length - 1

        return (
          <React.Fragment key={step.key}>
            <View style={styles.stepItem}>
              <StepCircle status={status} isActive={isActive} colors={colors} />
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive ? colors.primary : status === 'completed' ? colors.text : colors.textTertiary,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
            {!isLast && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor:
                      status === 'completed' || status === 'skipped'
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              />
            )}
          </React.Fragment>
        )
      })}
    </View>
  )
}

function StepCircle({
  status,
  isActive,
  colors,
}: {
  status: GitWizardStepStatus
  isActive: boolean
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const bgColor =
    status === 'completed'
      ? colors.primary
      : status === 'failed'
        ? colors.error
        : isActive
          ? colors.primary
          : colors.border

  const iconColor = status === 'completed' || isActive ? colors.primaryText : colors.textTertiary

  return (
    <View style={[styles.circle, { backgroundColor: bgColor }]}>
      {status === 'completed' && <Check color={iconColor} size={12} strokeWidth={3} />}
      {status === 'skipped' && <Minus color={iconColor} size={12} strokeWidth={3} />}
      {status === 'failed' && <X color="#fff" size={12} strokeWidth={3} />}
      {status === 'active' && <View style={[styles.activeDot, { backgroundColor: iconColor }]} />}
      {status === 'pending' && null}
    </View>
  )
}

const CIRCLE_SIZE = 24

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connector: {
    height: 2,
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  label: {
    ...typeStyles.meta,
    textAlign: 'center',
  },
})
