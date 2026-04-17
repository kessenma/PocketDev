import React from 'react'
import {
  ActivityIndicator,
  Image,
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
import { ChevronDown, ChevronUp, FileCode2, Filter, FolderOpen, Pin, Search, Trash2, X } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import type { TreeEntry } from '@pocketdev/shared/types'
import type { AgentType, TaskMode } from '@pocketdev/shared/schema'
import { useTheme } from '../../contexts/ThemeContext'
import { addRecentPrompt } from '../../services/storage'
import { listDirectory, searchFiles, fetchFileTree } from '../../services/api'
import AISuggestions from './AISuggestions'
import FindFilesButton from './FindFilesButton'
import PromptFilterSheet from './PromptFilterSheet'
import { useOnDeviceAIStore } from '../../stores/on-device-ai'
import { useNewTaskDraftStore } from '../../stores/new-task-draft'
import { useTaskStore } from '../../stores/tasks'
import { useFilesStore } from '../../stores/files'
import { useProjectsStore } from '../../stores/projects'
import { useConnectionStore } from '../../stores/connection'
import { useSetupStore } from '../../stores/setup'
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
import { pathToName } from '../files/model'
import { Assets } from '../../../assets'

type Props = {
  onSubmitted: () => void
}

const PROVIDER_LOGOS: Record<string, { light: ReturnType<typeof require>; dark: ReturnType<typeof require> }> = {
  claude: { light: Assets.claudeBlack, dark: Assets.claudeWhite },
  codex: { light: Assets.codexBlack, dark: Assets.codexWhite },
  copilot: { light: Assets.githubCopilotBlack, dark: Assets.githubCopilotWhite },
  minimax: { light: Assets.minimaxBlack, dark: Assets.minimaxWhite },
}

export default function NewTaskForm({ onSubmitted }: Props) {
  const { colors, isDark } = useTheme()
  const prompt = useNewTaskDraftStore((state) => state.prompt)
  const selectedProviderId = useNewTaskDraftStore((state) => state.selectedProviderId)
  const selectedModelId = useNewTaskDraftStore((state) => state.selectedModelId)
  const setPrompt = useNewTaskDraftStore((state) => state.setPrompt)
  const selectedTaskMode = useNewTaskDraftStore((state) => state.selectedTaskMode)
  const selectTaskMode = useNewTaskDraftStore((state) => state.selectTaskMode)
  const selectProvider = useNewTaskDraftStore((state) => state.selectProvider)
  const selectModel = useNewTaskDraftStore((state) => state.selectModel)
  const submitDraft = useNewTaskDraftStore((state) => state.submitDraft)
  const startTask = useTaskStore((state) => state.startTask)
  const selectedContextPaths = useFilesStore((state) => state.selectedContextPaths)
  const toggleContextPath = useFilesStore((state) => state.toggleContextPath)
  const clearContextPaths = useFilesStore((state) => state.clearContextPaths)
  const rootLabel = useFilesStore((state) => state.rootLabel)
  const rootPath = useFilesStore((state) => state.rootPath)
  const currentPath = useFilesStore((state) => state.currentPath)
  const selectedFile = useFilesStore((state) => state.selectedFile)
  const projects = useProjectsStore((state) => state.projects)
  const activeProject = projects.find((project) => project.isActive) ?? null
  const server = useConnectionStore((state) => state.server)
  const setupReport = useSetupStore((state) => state.report)

  const providers = useNewTaskDraftStore((state) => state.providers)
  const loadCapabilities = useNewTaskDraftStore((state) => state.loadCapabilities)
  const providerCatalog = providers ?? MODEL_PROVIDERS

  const selectedProvider = getProviderById(selectedProviderId as ModelProviderId, providerCatalog)
  const selectedModel = getModelById(selectedProviderId as ModelProviderId, selectedModelId, providerCatalog)

  // --- Model sheet state ---
  const [showModelSheet, setShowModelSheet] = React.useState(false)

  // --- File picker local state ---
  const [pickerExpanded, setPickerExpanded] = React.useState(false)
  const [pickerPath, setPickerPath] = React.useState('.')
  const [pickerEntries, setPickerEntries] = React.useState<TreeEntry[]>([])
  const [pickerLoading, setPickerLoading] = React.useState(false)
  const [pickerSearchQuery, setPickerSearchQuery] = React.useState('')
  const [pickerSearchResults, setPickerSearchResults] = React.useState<TreeEntry[]>([])
  const [pickerSearching, setPickerSearching] = React.useState(false)

  const providerAvailability = React.useMemo(() => {
    if (!providers) return undefined
    return providers.find((p) => p.id === selectedProviderId)?.availability
  }, [providers, selectedProviderId])

  React.useEffect(() => {
    loadCapabilities()
  }, [loadCapabilities])

  // --- On-device AI: load model + build index on mount ---
  const aiModelStatus = useOnDeviceAIStore((state) => state.modelStatus)
  const aiLoadModel = useOnDeviceAIStore((state) => state.loadModel)
  const aiBuildIndex = useOnDeviceAIStore((state) => state.buildIndex)
  const aiSuggest = useOnDeviceAIStore((state) => state.suggest)
  const aiHydrate = useOnDeviceAIStore((state) => state.hydrate)

  React.useEffect(() => {
    aiHydrate()
  }, [aiHydrate])

  React.useEffect(() => {
    if (aiModelStatus === 'downloaded') {
      aiLoadModel()
    }
  }, [aiModelStatus, aiLoadModel])

  // Auto-suggest when prompt is long enough — debounced 600ms
  React.useEffect(() => {
    if (prompt.trim().length < 15 || aiModelStatus !== 'ready') return
    const t = setTimeout(handleFindRelatedFiles, 600)
    return () => clearTimeout(t)
  }, [prompt]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    console.log('[FindFiles] Index effect — modelStatus:', aiModelStatus, 'server:', !!server)
    if (aiModelStatus !== 'ready' || !server) return
    console.log('[FindFiles] Fetching file tree for indexing...')
    fetchFileTree(server.ip, server.port, '.', 6)
      .then((res) => {
        console.log('[FindFiles] File tree fetched →', res.tree.length, 'top-level entries, base:', res.base)
        aiBuildIndex(res.base || '.', res.tree, server)
      })
      .catch((e) => console.error('[FindFiles] fetchFileTree failed:', e))
  }, [aiModelStatus, server, aiBuildIndex])

  // --- On-device AI: manual trigger ---
  const [aiSearching, setAiSearching] = React.useState(false)
  const [aiNoResults, setAiNoResults] = React.useState(false)
  const [showFilterSheet, setShowFilterSheet] = React.useState(false)

  async function handleFindRelatedFiles(textOverride?: string) {
    const searchText = textOverride ?? prompt
    const fileIndex = useOnDeviceAIStore.getState().fileIndex
    console.log('[FindFiles] Button pressed')
    console.log('[FindFiles] modelStatus:', aiModelStatus)
    console.log('[FindFiles] searchText:', searchText.trim().substring(0, 80))
    console.log('[FindFiles] fileIndex:', fileIndex ? `${fileIndex.paths.length} files indexed for ${fileIndex.rootPath}` : 'null')
    if (aiModelStatus !== 'ready' || !searchText.trim()) {
      console.log('[FindFiles] Aborting — model not ready or text empty')
      return
    }
    setAiSearching(true)
    setAiNoResults(false)
    try {
      // Build index on-demand if it's missing
      if (!fileIndex && server) {
        console.log('[FindFiles] Index missing — building on-demand...')
        const res = await fetchFileTree(server.ip, server.port, '.', 6)
        console.log('[FindFiles] File tree fetched →', res.tree.length, 'top-level entries, base:', res.base)
        await aiBuildIndex(res.base || '.', res.tree, server)
      }

      console.log('[FindFiles] Running suggest...')
      await aiSuggest(searchText)
      const { suggestions, restSuggestions } = useOnDeviceAIStore.getState()
      console.log('[FindFiles] Results:', suggestions.length, 'top,', restSuggestions.length, 'rest')
      suggestions.forEach((s) => console.log(`  [FindFiles] top  ${s.score.toFixed(3)} → ${s.path}`))
      restSuggestions.slice(0, 5).forEach((s) => console.log(`  [FindFiles] rest ${s.score.toFixed(3)} → ${s.path}`))
      if (suggestions.length === 0 && restSuggestions.length === 0) {
        setAiNoResults(true)
      }
    } catch (e) {
      console.error('[FindFiles] Error:', e)
    } finally {
      setAiSearching(false)
    }
  }

  const contextPaths = React.useMemo(() => {
    const merged = [...selectedContextPaths]
    if (selectedFile?.path && !merged.includes(selectedFile.path)) merged.unshift(selectedFile.path)
    return merged
  }, [selectedContextPaths, selectedFile?.path])

  // Load picker directory when expanded or path changes
  React.useEffect(() => {
    if (!pickerExpanded || !server) return
    let cancelled = false
    setPickerLoading(true)
    listDirectory(server.ip, server.port, pickerPath)
      .then((res) => {
        if (!cancelled) setPickerEntries(res.entries)
      })
      .catch(() => {
        if (!cancelled) setPickerEntries([])
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false)
      })
    return () => { cancelled = true }
  }, [pickerExpanded, pickerPath, server])

  function handlePickerSearch() {
    const q = pickerSearchQuery.trim()
    if (!q || !server) return
    setPickerSearching(true)
    searchFiles(server.ip, server.port, q, pickerPath)
      .then((res) => {
        setPickerSearchResults(
          res.results.map((r) => ({ name: pathToName(r.path), path: r.path, type: 'file' as const })),
        )
      })
      .catch(() => setPickerSearchResults([]))
      .finally(() => setPickerSearching(false))
  }

  function handlePickerClearSearch() {
    setPickerSearchQuery('')
    setPickerSearchResults([])
  }

  function handlePickerNavigate(path: string) {
    handlePickerClearSearch()
    setPickerPath(path)
  }

  function handlePickerUp() {
    if (pickerPath === '.') return
    const parent = pickerPath.includes('/') ? pickerPath.slice(0, pickerPath.lastIndexOf('/')) : '.'
    handlePickerNavigate(parent)
  }

  const pickerItems = pickerSearchQuery.trim().length > 0 ? pickerSearchResults : pickerEntries

  function handleSubmit() {
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) return

    addRecentPrompt(trimmedPrompt)

    const agentType = providerToAgentType(selectedProviderId)
    const contextSection = contextPaths.length > 0
      ? contextPaths.map((path) => `- ${path}`).join('\n')
      : '- No specific files pinned'

    const toolsHint = formatCompactToolsHint(setupReport)
    const taskPrompt = [
      'You are working in the active PocketDev repository context.',
      `Repository: ${activeProject?.name ?? rootLabel ?? 'Unknown repo'}`,
      `Workspace path: ${rootPath || 'Unknown path'}`,
      `Current folder: ${currentPath}`,
      `Current file focus: ${selectedFile?.path ?? 'None'}`,
      'Pinned file context:',
      contextSection,
      ...(toolsHint ? [toolsHint] : []),
      '',
      'User request:',
      trimmedPrompt,
    ].join('\n')

    const cliModelId = getCliModelId(selectedProviderId as ModelProviderId, selectedModelId, providerCatalog)
    startTask(taskPrompt, agentType, rootPath || null, cliModelId, selectedTaskMode)
    submitDraft()
    onSubmitted()
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        {/* ── Prompt (primary focus) ── */}
        <BauhausPanel style={styles.section} accentColor={colors.accentBlue}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Prompt</Text>
          <TextInput
            style={[styles.promptInput, { backgroundColor: colors.panelAlt, color: colors.text, borderColor: colors.border }]}
            value={prompt}
            onChangeText={(text) => { setPrompt(text); setAiNoResults(false) }}
            placeholder="What should the agent do?"
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
          />
          {/* Model selector button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowModelSheet(true)}
            style={[styles.modelButton, { borderColor: colors.border, backgroundColor: colors.panelAlt }]}
          >
            {PROVIDER_LOGOS[selectedProviderId] ? (
              <Image
                source={isDark ? PROVIDER_LOGOS[selectedProviderId].dark : PROVIDER_LOGOS[selectedProviderId].light}
                style={styles.modelButtonLogo}
                resizeMode="contain"
              />
            ) : null}
            <Text style={[styles.modelButtonLabel, { color: colors.text }]} numberOfLines={1}>
              {selectedProvider.label} / {selectedModel.name}
            </Text>
            <ChevronDown color={colors.textTertiary} size={14} strokeWidth={2.2} />
          </TouchableOpacity>
        </BauhausPanel>

        {/* ── AI File Suggestions ── */}
        {aiModelStatus === 'ready' && prompt.trim().length > 0 ? (
          <View style={styles.findFilesRow}>
            <View style={styles.findFilesMain}>
              <FindFilesButton searching={aiSearching} onPress={handleFindRelatedFiles} />
            </View>
            <TouchableOpacity
              style={[styles.filterButton, { borderColor: colors.border, backgroundColor: colors.panelAlt }]}
              onPress={() => setShowFilterSheet(true)}
              activeOpacity={0.7}
            >
              <Filter color={colors.textSecondary} size={16} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        ) : null}
        <AISuggestions />
        {aiNoResults ? (
          <Text style={[styles.aiNoResults, { color: colors.textTertiary }]}>
            No closely related files found for this prompt.
          </Text>
        ) : null}
        {showFilterSheet && (
          <PromptFilterSheet
            prompt={prompt}
            onDismiss={() => setShowFilterSheet(false)}
            onSearch={(phrase) => handleFindRelatedFiles(phrase)}
          />
        )}

        {/* ── File Context Picker ── */}
        <BauhausPanel style={styles.section} accentColor={colors.accentYellow}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity
              style={styles.pickerHeaderTap}
              activeOpacity={0.7}
              onPress={() => setPickerExpanded((prev) => !prev)}
            >
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                File Context{contextPaths.length > 0 ? ` (${contextPaths.length})` : ''}
              </Text>
              {pickerExpanded
                ? <ChevronUp color={colors.textSecondary} size={18} strokeWidth={2.2} />
                : <ChevronDown color={colors.textSecondary} size={18} strokeWidth={2.2} />}
            </TouchableOpacity>
            {contextPaths.length > 0 ? (
              <TouchableOpacity onPress={clearContextPaths} activeOpacity={0.7} hitSlop={8}>
                <Trash2 color={colors.textTertiary} size={16} strokeWidth={2.2} />
              </TouchableOpacity>
            ) : null}
          </View>

          {contextPaths.length > 0 ? (
            <View style={styles.chipRow}>
              {contextPaths.map((path) => (
                <View key={path} style={styles.chip}>
                  <BauhausBadge
                    label={pathToName(path)}
                    color={colors.accentBlue}
                    onRemove={() => toggleContextPath(path)}
                  />
                </View>
              ))}
            </View>
          ) : !pickerExpanded ? (
            <Text style={[styles.hintText, { color: colors.textTertiary }]}>
              Attach files for focused repo context.
            </Text>
          ) : null}

          {pickerExpanded ? (
            <View style={styles.pickerBody}>
              {/* Search bar */}
              <View style={[styles.pickerSearchBar, { backgroundColor: colors.panelAlt, borderColor: colors.border }]}>
                <Search color={colors.textTertiary} size={16} strokeWidth={2.2} />
                <TextInput
                  value={pickerSearchQuery}
                  onChangeText={setPickerSearchQuery}
                  placeholder={`Search in ${pickerPath === '.' ? rootLabel || 'project' : pickerPath}`}
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.pickerSearchInput, { color: colors.text }]}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onSubmitEditing={handlePickerSearch}
                />
                {pickerSearchQuery.length > 0 ? (
                  <Pressable onPress={handlePickerClearSearch}>
                    <Text style={[styles.pickerSearchAction, { color: colors.primary }]}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Path navigation */}
              <View style={styles.pickerPathRow}>
                <TouchableOpacity
                  onPress={handlePickerUp}
                  activeOpacity={0.7}
                  disabled={pickerPath === '.'}
                  style={[
                    styles.pickerPathButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: pickerPath === '.' ? colors.backgroundSecondary : colors.panelAlt,
                      opacity: pickerPath === '.' ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.pickerPathButtonText, { color: colors.text }]}>Up</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handlePickerNavigate('.')}
                  activeOpacity={0.7}
                  style={[styles.pickerPathButton, { borderColor: colors.border, backgroundColor: colors.panelAlt }]}
                >
                  <Text style={[styles.pickerPathButtonText, { color: colors.text }]}>Root</Text>
                </TouchableOpacity>
                <Text style={[styles.pickerPathLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {pickerPath === '.' ? rootLabel || 'Project root' : pickerPath}
                </Text>
              </View>

              {/* File list */}
              <View style={[styles.pickerList, { borderColor: colors.border }]}>
                {(pickerLoading || pickerSearching) ? (
                  <View style={styles.pickerLoadingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.pickerLoadingText, { color: colors.textSecondary }]}>
                      {pickerSearching ? 'Searching...' : 'Loading...'}
                    </Text>
                  </View>
                ) : null}

                {pickerItems.map((entry) => {
                  const isDir = entry.type === 'dir' || entry.type === ('directory' as string)
                  const isPinned = selectedContextPaths.includes(entry.path)

                  return (
                    <View
                      key={entry.path}
                      style={[styles.pickerEntryRow, { borderBottomColor: colors.border }]}
                    >
                      <Pressable
                        style={styles.pickerEntryMain}
                        onPress={() => {
                          if (isDir) {
                            handlePickerNavigate(entry.path)
                          } else {
                            toggleContextPath(entry.path)
                          }
                        }}
                      >
                        {isDir
                          ? <FolderOpen color={colors.primary} size={16} strokeWidth={2.2} />
                          : <FileCode2 color={isPinned ? colors.primary : colors.textSecondary} size={16} strokeWidth={2.2} />}
                        <Text
                          style={[styles.pickerEntryName, { color: isPinned ? colors.primary : colors.text }]}
                          numberOfLines={1}
                        >
                          {entry.name}
                        </Text>
                      </Pressable>

                      {!isDir ? (
                        <TouchableOpacity
                          onPress={() => toggleContextPath(entry.path)}
                          activeOpacity={0.7}
                          style={[
                            styles.pickerPinButton,
                            {
                              borderColor: isPinned ? colors.primary : colors.border,
                              backgroundColor: isPinned ? colors.primary + '18' : 'transparent',
                            },
                          ]}
                        >
                          <Pin color={isPinned ? colors.primary : colors.textSecondary} size={12} strokeWidth={2.2} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )
                })}

                {pickerItems.length === 0 && !pickerLoading && !pickerSearching ? (
                  <Text style={[styles.pickerEmptyText, { color: colors.textTertiary }]}>
                    {pickerSearchQuery.trim().length > 0 ? 'No results found.' : 'Empty folder.'}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </BauhausPanel>

        <BauhausPanel style={styles.section} accentColor={colors.accentRed}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Task Mode</Text>
          <View style={styles.modeRow}>
            {TASK_MODE_OPTIONS.map((option) => {
              const selected = option.value === selectedTaskMode
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.85}
                  onPress={() => selectTaskMode(option.value)}
                  style={[
                    styles.modeCard,
                    {
                      backgroundColor: selected ? colors.panelAlt : colors.panel,
                      borderColor: selected ? option.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.modeTitle, { color: colors.text }]}>{option.label}</Text>
                  <Text style={[styles.modeBody, { color: colors.textSecondary }]}>{option.description}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </BauhausPanel>

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
      {/* ── Model Selector Sheet ── */}
      <Modal
        visible={showModelSheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModelSheet(false)}
      >
        <View style={[styles.sheetContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetHeaderTitle, { color: colors.text }]}>Select Model</Text>
            <TouchableOpacity onPress={() => setShowModelSheet(false)} activeOpacity={0.7} style={styles.sheetCloseButton}>
              <X color={colors.textSecondary} size={22} strokeWidth={2.25} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent}>
            <ModelSelector
              providers={providerCatalog}
              selectedProviderId={selectedProviderId as ModelProviderId}
              selectedModelId={selectedModelId}
              onSelectProvider={selectProvider}
              onSelectModel={(providerId, modelId) => {
                selectModel(providerId, modelId)
                setShowModelSheet(false)
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const TOOLS_HINT_IDS = ['git', 'node', 'python', 'rust', 'go', 'typescript', 'docker', 'bun']

const DB_CONNECT_CMD: Record<string, (port: number) => string> = {
  postgres: (p) => `psql -h localhost -p ${p}`,
  redis: (p) => `redis-cli -p ${p}`,
  mongodb: (p) => `mongosh --port ${p}`,
  mysql: (p) => `mysql -h localhost -P ${p}`,
  supabase: (p) => `psql -h localhost -p ${p} -U postgres`,
}

function formatCompactToolsHint(report: import('@pocketdev/shared/types').PrerequisitesReport | null): string {
  if (!report?.tools?.length) return ''
  const installed = report.tools.filter((t) => t.status === 'installed' && TOOLS_HINT_IDS.includes(t.id))
  if (!installed.length) return ''
  const parts = installed.map((t) => {
    const v = t.version ? ` ${t.version.split('.').slice(0, 2).join('.')}` : ''
    const p = t.path ? ` (${t.path})` : ''
    return `${t.name}${v}${p}`
  })
  const lines = [`Available tools: ${parts.join(', ')}`]

  if (report.databases?.length) {
    const dbParts = report.databases.map((db) => {
      const v = db.version ? ` ${db.version}` : ''
      const cmd = DB_CONNECT_CMD[db.type]?.(db.port)
      return `${db.name}${v} (${db.status}, port ${db.port}${cmd ? ` — ${cmd}` : ''})`
    })
    lines.push(`Databases: ${dbParts.join(', ')}`)
  }

  return lines.join('\n')
}

function providerToAgentType(providerId: string): AgentType {
  if (providerId === 'codex') return 'codex'
  if (providerId === 'claude') return 'claude'
  if (providerId === 'copilot') return 'copilot'
  if (providerId === 'minimax') return 'minimax'
  return 'codex'
}

const TASK_MODE_OPTIONS: Array<{
  value: TaskMode
  label: string
  description: string
  accent: string
}> = [
  {
    value: 'default',
    label: 'Default',
    description: 'Full execution mode for normal coding and repo work.',
    accent: '#3b82f6',
  },
  {
    value: 'plan',
    label: 'Plan',
    description: 'Ask the agent to stay in planning mode before execution.',
    accent: '#f59e0b',
  },
]

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  modelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    alignSelf: 'flex-start',
  },
  modelButtonLogo: {
    width: 18,
    height: 18,
  },
  modelButtonLabel: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  modeRow: {
    gap: spacing[2],
  },
  modeCard: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[1],
  },
  modeTitle: {
    ...typeStyles.bodyStrong,
  },
  modeBody: {
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
  hintText: {
    ...typeStyles.bodySmall,
  },
  promptInput: {
    ...typeStyles.body,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    minHeight: 120,
    maxHeight: 360,
  },
  findFilesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing[2],
  },
  findFilesMain: {
    flex: 1,
  },
  filterButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiNoResults: {
    ...typeStyles.bodySmall,
    textAlign: 'center',
    marginTop: -spacing[2],
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

  // ── File Picker ──
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerHeaderTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerBody: {
    gap: spacing[3],
  },
  pickerSearchBar: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 42,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pickerSearchInput: {
    flex: 1,
    ...typeStyles.bodySmall,
  },
  pickerSearchAction: {
    ...typeStyles.bodySmall,
    fontWeight: '700',
  },
  pickerPathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pickerPathButton: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  pickerPathButtonText: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  pickerPathLabel: {
    ...typeStyles.bodySmall,
    flex: 1,
  },
  pickerList: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    maxHeight: 350,
  },
  pickerLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
  },
  pickerLoadingText: {
    ...typeStyles.bodySmall,
  },
  pickerEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerEntryMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pickerEntryName: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  pickerPinButton: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmptyText: {
    ...typeStyles.bodySmall,
    padding: spacing[3],
    textAlign: 'center',
  },

  // ── Model Sheet ──
  sheetContainer: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
  },
  sheetHeaderTitle: {
    ...typeStyles.screenTitle,
  },
  sheetCloseButton: {
    padding: spacing[2],
  },
  sheetBody: {
    flex: 1,
  },
  sheetBodyContent: {
    padding: spacing[4],
  },
})
