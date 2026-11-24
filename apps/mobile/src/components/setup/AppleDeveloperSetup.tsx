import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Info, Smartphone } from 'lucide-react-native'
import type { PrerequisitesReport } from '@pocketdev/shared/types'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, palette } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import AppleWizardModal from './AppleWizardModal'
import AscInfoSheet from './AscInfoSheet'
import { getAppleSummaryRows, type AppleRowState } from './apple-wizard/apple-setup-utils'
import { shouldShowAppleSetup } from './setup-tool-utils'

interface Props {
  report: PrerequisitesReport | null
  /** Locked while the server confirms cached state */
  disabled?: boolean
  showLoadingState?: boolean
  onDisabledPress?: () => void
}

const ROW_COLORS: Record<AppleRowState, string> = {
  ready: '#22c55e',
  attention: '#facc15',
  missing: '#ef4444',
}

/** Optional "App Store" section on the Workspace Tools screen (macOS hosts only). */
export default function AppleDeveloperSetup({ report, disabled = false, showLoadingState = false, onDisabledPress }: Props) {
  const { colors, isDark } = useTheme()
  const [showWizard, setShowWizard] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  if (!shouldShowAppleSetup(report)) return null

  const bauhaus = palette.bauhaus
  const rows = getAppleSummaryRows(report)
  const allReady = rows.every((r) => r.state === 'ready')
  const noneStarted = rows.every((r) => r.state === 'missing')
  const panelBackground = isDark ? '#101010' : '#faf7f0'
  const panelBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,26,0.08)'
  const accentColor = allReady ? bauhaus.blue : noneStarted ? bauhaus.black : bauhaus.yellow

  function handleOpen() {
    if (disabled) {
      onDisabledPress?.()
      return
    }
    setShowWizard(true)
  }

  return (
    <>
      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>App Store</Text>
        <TouchableOpacity
          onPress={() => setShowInfo(true)}
          hitSlop={10}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="About App Store setup"
        >
          <Info color={colors.textTertiary} size={15} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
        Optional — lets agents build and upload iOS apps to TestFlight from this Mac.
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: panelBackground, borderColor: panelBorder },
          showLoadingState && styles.cardLoading,
        ]}
      >
        <View style={[styles.accentBlock, { backgroundColor: accentColor, opacity: noneStarted ? 0.85 : 1 }]} />
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Smartphone color={colors.text} size={24} strokeWidth={2} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]}>App Store Connect</Text>
            <Text style={[styles.status, { color: allReady ? ROW_COLORS.ready : colors.textSecondary }]}>
              {allReady ? 'Ready' : noneStarted ? 'Not set up' : 'Partly set up'}
            </Text>
            {showLoadingState && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Checking server…</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.rows}>
          {rows.map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={[styles.rowDot, { backgroundColor: ROW_COLORS[row.state] }]} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{row.label}</Text>
              <Text style={[styles.rowDetail, { color: colors.textTertiary }]} numberOfLines={1}>
                {row.detail}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleOpen}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.primaryText }]}>
              {allReady ? 'Open App Store Setup' : 'Set up App Store'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showWizard && (
        <AppleWizardModal
          onDismiss={() => setShowWizard(false)}
          onComplete={() => setShowWizard(false)}
        />
      )}
      {showInfo && <AscInfoSheet onDismiss={() => setShowInfo(false)} />}
    </>
  )
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  sectionTitle: {
    ...typeStyles.sectionTitle,
  },
  sectionHint: {
    ...typeStyles.bodySmall,
    marginTop: -spacing[1],
    marginBottom: spacing[1],
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing[4],
    gap: spacing[3],
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardLoading: {
    opacity: 0.72,
  },
  accentBlock: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 76,
    height: 76,
    borderBottomLeftRadius: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  logoContainer: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  info: {
    flex: 1,
    gap: 2,
    paddingRight: 44,
  },
  name: {
    ...typeStyles.bodyBold,
    letterSpacing: -0.3,
  },
  status: {
    ...typeStyles.bodySmall,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: 2,
  },
  loadingText: {
    ...typeStyles.meta,
  },
  rows: {
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  rowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowLabel: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
  },
  rowDetail: {
    ...typeStyles.meta,
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 14,
  },
  actionText: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
  },
})
