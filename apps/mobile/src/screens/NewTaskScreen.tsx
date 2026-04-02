import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
} from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { getRecentPrompts, addRecentPrompt } from '../services/storage'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainTabParamList, RootStackParamList } from '../navigation/types'
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout'
import AdaptiveShell from '../components/layout/AdaptiveShell'
import SplitViewLayout from '../components/layout/SplitViewLayout'
import {
  MODEL_PROVIDERS,
  ModelSelector,
  getModelById,
  getProviderById,
} from '../components/model-selector'
import { useNewTaskDraftStore } from '../stores/new-task-draft'

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'NewTask'>,
    NativeStackNavigationProp<RootStackParamList>
  >
}

export default function NewTaskScreen({ navigation: _navigation }: Props) {
  const { colors } = useTheme()
  const { layoutMode } = useAdaptiveLayout()
  const prompt = useNewTaskDraftStore((state) => state.prompt)
  const selectedProviderId = useNewTaskDraftStore((state) => state.selectedProviderId)
  const selectedModelId = useNewTaskDraftStore((state) => state.selectedModelId)
  const lastActionMessage = useNewTaskDraftStore((state) => state.lastActionMessage)
  const setPrompt = useNewTaskDraftStore((state) => state.setPrompt)
  const applyRecentPrompt = useNewTaskDraftStore((state) => state.applyRecentPrompt)
  const selectProvider = useNewTaskDraftStore((state) => state.selectProvider)
  const selectModel = useNewTaskDraftStore((state) => state.selectModel)
  const submitDraft = useNewTaskDraftStore((state) => state.submitDraft)

  const recentPrompts = getRecentPrompts()
  const selectedProvider = getProviderById(selectedProviderId)
  const selectedModel = getModelById(selectedProviderId, selectedModelId)

  function handleRun() {
    if (prompt.trim()) {
      addRecentPrompt(prompt.trim())
    }
    submitDraft()
  }

  function handleRecentPress(recent: string) {
    applyRecentPrompt(recent)
  }

  const composer = (
    <View style={[styles.composerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headingBlock}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Model Provider</Text>
        <Text style={[styles.helperText, { color: colors.textTertiary }]}>
          AI CLI agnostic for now. The selected provider and model stay local until the server agent wiring lands.
        </Text>
      </View>

      <ModelSelector
        providers={MODEL_PROVIDERS}
        selectedProviderId={selectedProviderId}
        selectedModelId={selectedModelId}
        onSelectProvider={selectProvider}
        onSelectModel={selectModel}
      />

      <View
        style={[
          styles.selectionSummary,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.selectionEyebrow, { color: colors.textTertiary }]}>
          Current selection
        </Text>
        <Text style={[styles.selectionTitle, { color: colors.text }]}>
          {selectedProvider.label} / {selectedModel.name}
        </Text>
        <Text style={[styles.selectionBody, { color: colors.textSecondary }]}>
          {selectedModel.headline}
        </Text>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Prompt</Text>
      <TextInput
        style={[
          styles.promptInput,
          { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
        ]}
        value={prompt}
        onChangeText={setPrompt}
        placeholder="What should the agent do?"
        placeholderTextColor={colors.textTertiary}
        multiline
        textAlignVertical="top"
        autoFocus
      />

      <View
        style={[
          styles.statusBanner,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          {lastActionMessage}
        </Text>
      </View>

      <Pressable
        style={[styles.runButton, { backgroundColor: colors.primary }]}
        onPress={handleRun}
        accessibilityRole="button"
      >
        <Text style={[styles.runButtonText, { color: colors.primaryText }]}>Save Draft</Text>
      </Pressable>
    </View>
  )

  const recentPanel = (
    <View style={[styles.recentPanel, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
      <Text style={[styles.recentLabel, { color: colors.textTertiary }]}>Recent prompts</Text>
      {recentPrompts.length > 0 ? (
        <View>
          {recentPrompts.map((item, i) => (
            <Pressable
              key={`${i}-${item}`}
              style={[styles.recentItem, { borderColor: colors.border }]}
              onPress={() => handleRecentPress(item)}
            >
              <Text style={[styles.recentText, { color: colors.textSecondary }]} numberOfLines={2}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={[styles.emptyRecent, { color: colors.textSecondary }]}>
          Your recent prompts will appear here for quick reuse.
        </Text>
      )}
    </View>
  )

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AdaptiveShell maxWidth={1240} style={{ backgroundColor: colors.background }}>
        {layoutMode === 'tabletSplit' ? (
          <SplitViewLayout leading={recentPanel} trailing={composer} leadingWidth={320} />
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            keyboardShouldPersistTaps="handled"
          >
            {composer}
            {recentPrompts.length > 0 ? recentPanel : null}
          </ScrollView>
        )}
      </AdaptiveShell>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  composerCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[3],
  },
  label: {
    ...typographyScale.sm,
    fontWeight: '500',
  },
  headingBlock: {
    gap: spacing[2],
  },
  helperText: {
    ...typographyScale.sm,
  },
  selectionSummary: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[1],
  },
  selectionEyebrow: {
    ...typographyScale.xs,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  selectionTitle: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  selectionBody: {
    ...typographyScale.sm,
  },
  promptInput: {
    ...typographyScale.base,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    minHeight: 120,
    flex: 1,
    maxHeight: 360,
  },
  statusBanner: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  statusText: {
    ...typographyScale.sm,
  },
  runButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  runButtonText: {
    ...typographyScale.base,
    fontWeight: '600',
  },
  recentLabel: {
    ...typographyScale.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  recentPanel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[2],
    minHeight: 220,
  },
  recentItem: {
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentText: {
    ...typographyScale.sm,
  },
  emptyRecent: {
    ...typographyScale.sm,
    marginTop: spacing[2],
  },
})
