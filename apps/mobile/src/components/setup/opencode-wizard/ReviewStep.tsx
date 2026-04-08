import React from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { Check, CircleAlert, ShieldCheck, TerminalSquare } from 'lucide-react-native'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { Assets } from '../../../../assets'
import type { OpenCodeSetupStatus } from '@pocketdev/shared/types'

type WizardAction = { type: 'STEP_COMPLETE'; step: 'review' }

interface Props {
  openCodeStatus: OpenCodeSetupStatus | null
  dispatch: (action: WizardAction) => void
}

export default function ReviewStep({ openCodeStatus, dispatch }: Props) {
  const { colors, isDark } = useTheme()
  const installNeeded = !openCodeStatus?.installed
  const verifyNeeded = !openCodeStatus?.verified
  const tasks = [
    installNeeded ? 'Install OpenCode CLI from the official installer' : 'OpenCode CLI already installed',
    verifyNeeded ? 'Verify non-interactive OpenCode launch' : 'OpenCode runtime already verified',
  ]

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={isDark ? Assets.opencodeWhite : Assets.opencodeBlack} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.text }]}>OpenCode setup plan</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            PocketDev will install the runtime if needed and confirm it can launch cleanly before provider setup is added later.
          </Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <StatusRow
            icon={installNeeded ? <CircleAlert color={colors.error} size={18} strokeWidth={2.25} /> : <Check color="#22c55e" size={18} strokeWidth={2.25} />}
            label="OpenCode CLI"
            value={openCodeStatus?.installed ? `Installed${openCodeStatus.version ? ` · v${openCodeStatus.version}` : ''}` : 'Not installed'}
            detail={openCodeStatus?.path ?? 'PocketDev will install the OpenCode runtime on the workspace.'}
            colors={colors}
          />
          <StatusRow
            icon={<ShieldCheck color={openCodeStatus?.verified ? '#22c55e' : colors.primary} size={18} strokeWidth={2.25} />}
            label="Verification"
            value={openCodeStatus?.verified ? 'Ready' : 'Needs verification'}
            detail={openCodeStatus?.verified
              ? 'PocketDev has already confirmed that OpenCode launches correctly in non-interactive mode.'
              : 'PocketDev will run a lightweight OpenCode CLI check to confirm the runtime is healthy.'}
            colors={colors}
          />
          <StatusRow
            icon={<TerminalSquare color={colors.primary} size={18} strokeWidth={2.25} />}
            label="Scope"
            value="Runtime only"
            detail="This phase only sets up OpenCode itself. Provider configuration comes later."
            colors={colors}
          />
        </View>

        <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.planLabel, { color: colors.textTertiary }]}>What happens next</Text>
          {tasks.map((task, index) => (
            <View key={task} style={styles.planRow}>
              <View style={[styles.planNumber, { backgroundColor: `${colors.primary}18` }]}>
                <Text style={[styles.planNumberText, { color: colors.primary }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.planText, { color: colors.text }]}>{task}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.continueButton, { backgroundColor: colors.primary }]} onPress={() => dispatch({ type: 'STEP_COMPLETE', step: 'review' })} activeOpacity={0.7}>
        <Text style={[styles.continueText, { color: colors.primaryText }]}>
          {installNeeded || verifyNeeded ? 'Continue setup' : 'Finish review'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

function StatusRow({
  icon,
  label,
  value,
  detail,
  colors,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={styles.statusRow}>
      <View style={styles.statusIcon}>{icon}</View>
      <View style={styles.statusText}>
        <Text style={[styles.statusLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.statusValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statusDetail, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing[3] },
  scroll: { flex: 1 },
  scrollContent: { gap: spacing[3], paddingBottom: spacing[4] },
  hero: { alignItems: 'center', gap: spacing[2], paddingTop: spacing[4] },
  logo: { width: 42, height: 42 },
  title: { ...typographyScale.xl, fontWeight: '700', textAlign: 'center' },
  subtitle: { ...typographyScale.sm, textAlign: 'center' },
  statusCard: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing[4], gap: spacing[4] },
  statusRow: { flexDirection: 'row', gap: spacing[3] },
  statusIcon: { width: 20, alignItems: 'center', marginTop: 2 },
  statusText: { flex: 1, gap: 2 },
  statusLabel: { ...typographyScale.xs, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1 },
  statusValue: { ...typographyScale.base, fontWeight: '700' },
  statusDetail: { ...typographyScale.sm, lineHeight: 20 },
  planCard: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing[4], gap: spacing[3] },
  planLabel: { ...typographyScale.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  planRow: { flexDirection: 'row', gap: spacing[3], alignItems: 'center' },
  planNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  planNumberText: { ...typographyScale.sm, fontWeight: '700' },
  planText: { ...typographyScale.sm, flex: 1, lineHeight: 20 },
  continueButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[4], borderRadius: borderRadius.lg },
  continueText: { ...typographyScale.base, fontWeight: '600' },
})
