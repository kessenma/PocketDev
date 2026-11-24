import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Check } from 'lucide-react-native'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { typeStyles } from '../../../theme/typography'
import type { AppleSetupStatus } from '@pocketdev/shared/types'
import { APPLE_WIZARD_STEPS, isAppleStepDone, type AppleWizardStep } from './apple-setup-utils'

interface Props {
  currentStep: AppleWizardStep
  status: AppleSetupStatus
  verified: boolean
  onSelect: (step: AppleWizardStep) => void
}

/** Like the Go wizard stepper, but every step can be revisited (e.g. to change telemetry or replace a key). */
export default function AppleWizardStepper({ currentStep, status, verified, onSelect }: Props) {
  const { colors } = useTheme()

  return (
    <View style={styles.container}>
      {APPLE_WIZARD_STEPS.map((step, index) => {
        const isActive = currentStep === step.key
        const done = step.key === 'verify' ? verified : isAppleStepDone(step.key, status)
        const isLast = index === APPLE_WIZARD_STEPS.length - 1
        const circleColor = isActive || done ? colors.primary : colors.border
        const iconColor = isActive || done ? colors.primaryText : colors.textTertiary

        return (
          <React.Fragment key={step.key}>
            <TouchableOpacity
              style={styles.stepItem}
              onPress={() => onSelect(step.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${step.label}${done ? ', done' : ''}`}
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.circle, { backgroundColor: circleColor }]}>
                {done && !isActive
                  ? <Check color={iconColor} size={12} strokeWidth={3} />
                  : isActive
                    ? <View style={[styles.activeDot, { backgroundColor: iconColor }]} />
                    : null}
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive ? colors.primary : done ? colors.text : colors.textTertiary,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </TouchableOpacity>
            {!isLast && (
              <View style={[styles.connector, { backgroundColor: done ? colors.primary : colors.border }]} />
            )}
          </React.Fragment>
        )
      })}
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
