import React from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { X } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import type { AgentType } from '@pocketdev/shared/schema'
import { useTheme } from '../../contexts/ThemeContext'
import { getRecentPrompts, addRecentPrompt } from '../../services/storage'
import { useNewTaskDraftStore } from '../../stores/new-task-draft'
import { useTaskStore } from '../../stores/tasks'
import { useFilesStore } from '../../stores/files'
import { useProjectsStore } from '../../stores/projects'
import {
  MODEL_PROVIDERS,
  ModelSelector,
  getModelById,
  getProviderById,
  getCliModelId,
  type ModelProviderId,
} from '../model-selector'
import BauhausButton from '../shared/BauhausButton'
import BauhausBadge from '../shared/BauhausBadge'
import { BauhausPanel } from '../shared/BauhausPanel'
import { typeStyles } from '../../theme/typography'

type Props = {
  visible: boolean
  onClose: () => void
}

export default function NewTaskSheet({ visible, onClose }: Props) {
  const { colors } = useTheme()
  const prompt = useNewTaskDraftStore((state) => state.prompt)
  const selectedProviderId = useNewTaskDraftStore((state) => state.selectedProviderId)
  const selectedModelId = useNewTaskDraftStore((state) => state.selectedModelId)
  const setPrompt = useNewTaskDraftStore((state) => state.setPrompt)
  const applyRecentPrompt = useNewTaskDraftStore((state) => state.applyRecentPrompt)
  const selectProvider = useNewTaskDraftStore((state) => state.selectProvider)
  const selectModel = useNewTaskDraftStore((state) => state.selectModel)
  const submitDraft = useNewTaskDraftStore((state) => state.submitDraft)
  const startTask = useTaskStore((state) => state.startTask)
  const selectedContextPaths = useFilesStore((state) => state.selectedContextPaths)
  const rootLabel = useFilesStore((state) => state.rootLabel)
  const rootPath = useFilesStore((state) => state.rootPath)
  const currentPath = useFilesStore((state) => state.currentPath)
  const selectedFile = useFilesStore((state) => state.selectedFile)
  const projects = useProjectsStore((state) => state.projects)
  const activeProject = projects.find((project) => project.isActive) ?? null

  const providers = useNewTaskDraftStore((state) => state.providers)
  const loadCapabilities = useNewTaskDraftStore((state) => state.loadCapabilities)

  const selectedProvider = getProviderById(selectedProviderId as ModelProviderId)
  const selectedModel = getModelById(selectedProviderId as ModelProviderId, selectedModelId)
  const recentPrompts = getRecentPrompts()

  const providerAvailability = React.useMemo(() => {
    if (!providers) return undefined
    return providers.find((p) => p.id === selectedProviderId)?.availability
  }, [providers, selectedProviderId])

  React.useEffect(() => {
    if (visible) loadCapabilities()
  }, [visible, loadCapabilities])

  const contextPaths = React.useMemo(() => {
    const merged = [...selectedContextPaths]
    if (selectedFile?.path && !merged.includes(selectedFile.path)) merged.unshift(selectedFile.path)
    return merged
  }, [selectedContextPaths, selectedFile?.path])

  function handleSubmit() {
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) return

    addRecentPrompt(trimmedPrompt)

    const agentType = providerToAgentType(selectedProviderId)
    const contextSection = contextPaths.length > 0
      ? contextPaths.map((path) => `- ${path}`).join('\n')
      : '- No specific files pinned'

    const taskPrompt = [
      'You are working in the active PocketDev repository context.',
      `Repository: ${activeProject?.name ?? rootLabel ?? 'Unknown repo'}`,
      `Workspace path: ${rootPath || 'Unknown path'}`,
      `Current folder: ${currentPath}`,
      `Current file focus: ${selectedFile?.path ?? 'None'}`,
      'Pinned file context:',
      contextSection,
      '',
      'User request:',
      trimmedPrompt,
    ].join('\n')

    const cliModelId = getCliModelId(selectedProviderId as ModelProviderId, selectedModelId)
    startTask(taskPrompt, agentType, rootPath || null, cliModelId)
    submitDraft()
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Task</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeButton}>
            <X color={colors.textSecondary} size={22} strokeWidth={2.25} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <BauhausPanel style={styles.section} accentColor={colors.accentBlue}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Model Provider</Text>
            <ModelSelector
              providers={providers ?? MODEL_PROVIDERS}
              selectedProviderId={selectedProviderId as ModelProviderId}
              selectedModelId={selectedModelId}
              onSelectProvider={selectProvider}
              onSelectModel={selectModel}
            />
            <View style={[styles.selectionSummary, { backgroundColor: colors.panelAlt, borderColor: colors.border }]}>
              <Text style={[styles.selectionTitle, { color: colors.text }]}>
                {selectedProvider.label} / {selectedModel.name}
              </Text>
              <Text style={[styles.selectionBody, { color: colors.textSecondary }]}>
                {selectedModel.headline}
              </Text>
            </View>
          </BauhausPanel>

          {contextPaths.length > 0 ? (
            <BauhausPanel style={styles.section} accentColor={colors.accentYellow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Pinned Files ({contextPaths.length})
              </Text>
              <View style={styles.chipRow}>
                {contextPaths.map((path) => (
                  <View key={path} style={styles.chip}>
                    <BauhausBadge label={path} color={colors.accentBlue} />
                  </View>
                ))}
              </View>
            </BauhausPanel>
          ) : null}

          <BauhausPanel style={styles.section} accentColor={colors.accentRed}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Prompt</Text>
            <TextInput
              style={[styles.promptInput, { backgroundColor: colors.panelAlt, color: colors.text, borderColor: colors.border }]}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="What should the agent do?"
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </BauhausPanel>

          {recentPrompts.length > 0 ? (
            <BauhausPanel style={styles.section} accentColor={colors.accentYellow}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>Recent prompts</Text>
              {recentPrompts.map((item, i) => (
                <Pressable
                  key={`${i}-${item}`}
                  style={[styles.recentItem, { borderColor: colors.border }]}
                  onPress={() => applyRecentPrompt(item)}
                >
                  <Text style={[styles.recentText, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </BauhausPanel>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <BauhausButton
            onPress={handleSubmit}
            disabled={prompt.trim().length === 0 || (providerAvailability != null && providerAvailability !== 'available')}
          >
            {providerAvailability === 'not_installed'
              ? `${selectedProvider.label} not installed`
              : providerAvailability === 'installed_no_auth'
                ? `${selectedProvider.label} not authenticated`
                : 'Start Task'}
          </BauhausButton>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function providerToAgentType(providerId: string): AgentType {
  if (providerId === 'codex') return 'codex'
  if (providerId === 'claude') return 'claude'
  return 'codex'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
  },
  headerTitle: {
    ...typeStyles.screenTitle,
  },
  closeButton: {
    padding: spacing[2],
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  section: {
    gap: spacing[2],
  },
  label: {
    ...typeStyles.labelStrong,
  },
  selectionSummary: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[1],
  },
  selectionTitle: {
    ...typeStyles.bodyStrong,
  },
  selectionBody: {
    ...typeStyles.bodySmall,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    maxWidth: '100%',
  },
  promptInput: {
    ...typeStyles.body,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    minHeight: 120,
    maxHeight: 360,
  },
  recentItem: {
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
  },
  recentText: {
    ...typeStyles.bodySmall,
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 2,
  },
})
