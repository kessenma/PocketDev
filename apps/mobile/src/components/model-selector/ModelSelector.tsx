import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import type { ModelProvider, ModelProviderId } from './model'
import { typeStyles } from '../../theme/typography'

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
  const { colors } = useTheme()
  const selectedProvider =
    providers.find((provider) => provider.id === selectedProviderId) ?? providers[0]

  return (
    <View style={styles.container}>
      <View style={styles.providerRow}>
        {providers.map((provider) => {
          const isSelected = provider.id === selectedProvider.id
          const isUnavailable = provider.availability === 'not_installed'
          const needsAuth = provider.availability === 'installed_no_auth'

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
                  borderColor: needsAuth ? colors.accentYellow : colors.border,
                  opacity: isUnavailable ? 0.5 : 1,
                },
              ]}
            >
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

      <View style={[styles.providerPanel, { backgroundColor: colors.panel, borderColor: colors.border }]}>
        <Text style={[styles.providerSummary, { color: colors.textSecondary }]}>
          {selectedProvider.summary}
        </Text>
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

        <View style={styles.modelList}>
          {selectedProvider.models.map((model) => {
            const isSelected = model.id === selectedModelId
            const providerDisabled = selectedProvider.availability === 'not_installed' || selectedProvider.availability === 'installed_no_auth'

            return (
              <Pressable
                key={model.id}
                accessibilityRole="button"
                disabled={providerDisabled}
                onPress={() => onSelectModel(selectedProvider.id, model.id)}
                style={[
                  styles.modelCard,
                  {
                    backgroundColor: isSelected ? colors.panelAlt : colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.modelHeader}>
                  <Text style={[styles.modelName, { color: colors.text }]}>{model.name}</Text>
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
                <Text style={[styles.modelDescription, { color: colors.textTertiary }]}>
                  {model.description}
                </Text>
              </Pressable>
            )
          })}
        </View>
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
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  providerChipText: {
    ...typeStyles.meta,
  },
  providerPanel: {
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    padding: spacing[3],
    gap: spacing[3],
  },
  providerSummary: {
    ...typeStyles.bodySmall,
  },
  providerWarning: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
  },
  modelList: {
    gap: spacing[3],
  },
  modelCard: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  modelHeader: {
    gap: spacing[1],
  },
  modelName: {
    ...typeStyles.bodyStrong,
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
  },
})
