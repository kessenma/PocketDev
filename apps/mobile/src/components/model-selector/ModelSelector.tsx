import React from 'react'
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ChevronDown, ChevronUp, Check } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import type { ModelProvider, ModelProviderId } from './model'
import { typeStyles } from '../../theme/typography'
import { Assets } from '../../../assets'

const PROVIDER_LOGOS: Record<ModelProviderId, { light: ReturnType<typeof require>; dark: ReturnType<typeof require> }> = {
  claude: { light: Assets.claudeBlack, dark: Assets.claudeWhite },
  codex: { light: Assets.codexBlack, dark: Assets.codexWhite },
  copilot: { light: Assets.githubCopilotBlack, dark: Assets.githubCopilotWhite },
  minimax: { light: Assets.minimaxBlack, dark: Assets.minimaxWhite },
}

type Props = {
  providers: ModelProvider[]
  selectedProviderId: ModelProviderId
  selectedModelId: string
  onSelectProvider: (providerId: ModelProviderId) => void
  onSelectModel: (providerId: ModelProviderId, modelId: string) => void
}

export default function ModelSelector({
  providers,
  selectedProviderId,
  selectedModelId,
  onSelectProvider,
  onSelectModel,
}: Props) {
  const { colors, isDark } = useTheme()
  const [showDescriptions, setShowDescriptions] = React.useState(false)
  const selectedProvider =
    providers.find((provider) => provider.id === selectedProviderId) ?? providers[0]

  return (
    <View style={styles.container}>
      {/* ── Provider tabs ── */}
      <View style={styles.providerRow}>
        {providers.map((provider) => {
          const isSelected = provider.id === selectedProvider.id
          const isUnavailable = provider.availability === 'not_installed'
          const needsAuth = provider.availability === 'installed_no_auth'
          const logos = PROVIDER_LOGOS[provider.id]

          return (
            <Pressable
              key={provider.id}
              accessibilityRole="button"
              disabled={isUnavailable}
              onPress={() => onSelectProvider(provider.id)}
              style={[
                styles.providerChip,
                {
                  backgroundColor: isUnavailable
                    ? colors.backgroundSecondary
                    : isSelected
                      ? colors.primary
                      : colors.panelAlt,
                  borderColor: needsAuth ? colors.accentYellow : isSelected ? colors.primary : colors.border,
                  opacity: isUnavailable ? 0.5 : 1,
                },
              ]}
            >
              {logos ? (
                <Image
                  source={isSelected ? (isDark ? logos.light : logos.dark) : (isDark ? logos.dark : logos.light)}
                  style={styles.providerLogo}
                  resizeMode="contain"
                />
              ) : null}
              <Text
                style={[
                  styles.providerChipText,
                  { color: isUnavailable ? colors.textTertiary : isSelected ? colors.primaryText : colors.text },
                ]}
              >
                {provider.label}
                {isUnavailable ? ' (N/A)' : needsAuth ? ' (!)' : ''}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* ── Availability warnings ── */}
      {selectedProvider.availability === 'not_installed' && (
        <Text style={[styles.providerWarning, { color: colors.textTertiary }]}>
          Not installed on server — set up via Settings.
        </Text>
      )}
      {selectedProvider.availability === 'installed_no_auth' && (
        <Text style={[styles.providerWarning, { color: colors.accentYellow }]}>
          Installed but not authenticated — complete setup in Settings.
        </Text>
      )}

      {/* ── Description toggle ── */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowDescriptions((prev) => !prev)}
        style={styles.descToggle}
      >
        <Text style={[styles.descToggleText, { color: colors.textTertiary }]}>
          {showDescriptions ? 'Hide details' : 'Show details'}
        </Text>
        {showDescriptions
          ? <ChevronUp color={colors.textTertiary} size={14} strokeWidth={2.2} />
          : <ChevronDown color={colors.textTertiary} size={14} strokeWidth={2.2} />}
      </TouchableOpacity>

      {/* ── Model list ── */}
      <View style={styles.modelList}>
        {selectedProvider.models.map((model) => {
          const isSelected = model.id === selectedModelId
          const providerDisabled =
            selectedProvider.availability === 'not_installed' ||
            selectedProvider.availability === 'installed_no_auth'

          return (
            <Pressable
              key={model.id}
              accessibilityRole="button"
              disabled={providerDisabled}
              onPress={() => onSelectModel(selectedProvider.id, model.id)}
              style={[
                styles.modelCard,
                {
                  backgroundColor: isSelected ? colors.primary + '14' : colors.backgroundSecondary,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2.5 : 1,
                },
              ]}
            >
              <View style={styles.modelHeader}>
                <View style={styles.modelTitleRow}>
                  {isSelected ? (
                    <View style={[styles.selectedDot, { backgroundColor: colors.primary }]}>
                      <Check color={colors.primaryText} size={10} strokeWidth={3} />
                    </View>
                  ) : null}
                  <Text style={[styles.modelName, { color: isSelected ? colors.primary : colors.text }]}>
                    {model.name}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.modelContext,
                    { color: isSelected ? colors.primary : colors.textTertiary },
                  ]}
                >
                  {model.contextWindow}
                </Text>
              </View>
              <Text style={[styles.modelHeadline, { color: colors.textSecondary }]}>
                {model.headline}
              </Text>
              {showDescriptions ? (
                <Text style={[styles.modelDescription, { color: colors.textTertiary }]}>
                  {model.description}
                </Text>
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  providerLogo: {
    width: 20,
    height: 20,
  },
  providerChipText: {
    ...typeStyles.labelStrong,
  },
  providerWarning: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
  },
  descToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    alignSelf: 'flex-end',
  },
  descToggleText: {
    ...typeStyles.meta,
  },
  modelList: {
    gap: spacing[2],
  },
  modelCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[1],
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  selectedDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelName: {
    ...typeStyles.screenTitle,
    fontSize: 16,
    lineHeight: 20,
  },
  modelContext: {
    ...typeStyles.meta,
  },
  modelHeadline: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
  },
  modelDescription: {
    ...typeStyles.bodySmall,
    marginTop: spacing[1],
  },
})
