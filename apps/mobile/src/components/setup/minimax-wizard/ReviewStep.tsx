import React from 'react'
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { Check, CircleAlert, ShieldCheck, TerminalSquare } from 'lucide-react-native'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../../contexts/ThemeContext'
import { Assets } from '../../../../assets'
import type { MinimaxSetupStatus } from '@pocketdev/shared/types'

type WizardAction =
  | { type: 'STEP_COMPLETE'; step: 'review' }

interface Props {
  minimaxStatus: MinimaxSetupStatus | null
  dispatch: (action: WizardAction) => void
  onClose: () => void
}

export default function ReviewStep({ minimaxStatus, dispatch, onClose }: Props) {
  const { colors, isDark } = useTheme()
  const opencodeInstalled = minimaxStatus?.opencode_installed ?? false
  const apiKeyConfigured = minimaxStatus?.api_key_configured ?? false

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={isDark ? Assets.minimaxWhite : Assets.minimaxBlack} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.text }]}>Minimax setup plan</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Minimax is configured as an OpenCode provider — no binary to install, just an API key.
          </Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <StatusRow
            icon={
              opencodeInstalled
                ? <Check color="#22c55e" size={18} strokeWidth={2.25} />
                : <CircleAlert color={colors.error} size={18} strokeWidth={2.25} />
            }
            label="OpenCode Runtime"
            value={opencodeInstalled
              ? `Installed${minimaxStatus?.opencode_version ? ` · v${minimaxStatus.opencode_version}` : ''}`
              : 'Not installed'}
            detail={opencodeInstalled
              ? 'OpenCode is installed and ready to accept provider configuration.'
              : 'OpenCode must be installed first. Minimax is configured as an OpenCode provider.'}
            colors={colors}
          />
          <StatusRow
            icon={
              apiKeyConfigured
                ? <Check color="#22c55e" size={18} strokeWidth={2.25} />
                : <ShieldCheck color={colors.primary} size={18} strokeWidth={2.25} />
            }
            label="Minimax API Key"
            value={apiKeyConfigured
              ? (minimaxStatus?.api_key_masked ?? 'Configured')
              : 'Not configured'}
            detail={apiKeyConfigured
              ? 'A Minimax API key is already present in the OpenCode config.'
              : "You'll enter your Minimax API key in the next step."}
            colors={colors}
          />
          <StatusRow
            icon={<TerminalSquare color={colors.primary} size={18} strokeWidth={2.25} />}
            label="Scope"
            value="Provider config only"
            detail="No binary is installed. This configures Minimax as an OpenCode provider on your workspace."
            colors={colors}
          />
        </View>

        {!opencodeInstalled && (
          <View style={[styles.warningBanner, { backgroundColor: `${colors.error}18`, borderColor: `${colors.error}40` }]}>
            <CircleAlert color={colors.error} size={16} strokeWidth={2.25} />
            <Text style={[styles.warningText, { color: colors.error }]}>
              OpenCode must be installed before Minimax can be configured.
            </Text>
          </View>
        )}
      </ScrollView>

      {opencodeInstalled ? (
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={() => dispatch({ type: 'STEP_COMPLETE', step: 'review' })}
          activeOpacity={0.7}
        >
          <Text style={[styles.continueText, { color: colors.primaryText }]}>
            {apiKeyConfigured ? 'Continue' : 'Continue setup'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={[styles.continueText, { color: colors.text }]}>Setup OpenCode First</Text>
        </TouchableOpacity>
      )}
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  warningText: { ...typographyScale.sm, flex: 1, lineHeight: 20 },
  continueButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  continueText: { ...typographyScale.base, fontWeight: '600' },
})
