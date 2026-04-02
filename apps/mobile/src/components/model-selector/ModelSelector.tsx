import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing, typographyScale } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import type { ModelProvider, ModelProviderId } from './model'

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

          return (
            <Pressable
              key={provider.id}
              accessibilityRole="button"
              onPress={() => onSelectProvider(provider.id)}
              style={[
                styles.providerChip,
                {
                  backgroundColor: isSelected ? colors.primary : colors.background,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.providerChipText,
                  { color: isSelected ? colors.primaryText : colors.text },
                ]}
              >
                {provider.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View
        style={[
          styles.providerPanel,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.providerSummary, { color: colors.textSecondary }]}>
          {selectedProvider.summary}
        </Text>

        <View style={styles.modelList}>
          {selectedProvider.models.map((model) => {
            const isSelected = model.id === selectedModelId

            return (
              <Pressable
                key={model.id}
                accessibilityRole="button"
                onPress={() => onSelectModel(selectedProvider.id, model.id)}
                style={[
                  styles.modelCard,
                  {
                    backgroundColor: isSelected ? colors.surface : colors.background,
                    borderColor: isSelected ? colors.primary : colors.border,
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
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  providerChipText: {
    ...typographyScale.sm,
    fontWeight: '700',
  },
  providerPanel: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[3],
    gap: spacing[3],
  },
  providerSummary: {
    ...typographyScale.sm,
  },
  modelList: {
    gap: spacing[3],
  },
  modelCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  modelHeader: {
    gap: spacing[1],
  },
  modelName: {
    ...typographyScale.base,
    fontWeight: '700',
  },
  modelContext: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  modelHeadline: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  modelDescription: {
    ...typographyScale.sm,
  },
})
