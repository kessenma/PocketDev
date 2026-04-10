import React, { useState, useRef, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import RNClipboard from '@react-native-clipboard/clipboard'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { Copy, Sparkles, Sun, Moon, X, Send, ChevronDown } from 'lucide-react-native'

// ─── Terminal color schemes ──────────────────────────────────────────────────

const TERMINAL_DARK = {
  bg: '#1a1a2e',
  text: '#e0e0e0',
  cursor: '#e0e0e0',
  selection: 'rgba(59,130,246,0.3)',
  lineNumber: '#555577',
}

const TERMINAL_LIGHT = {
  bg: '#f8f8f8',
  text: '#1a1a2e',
  cursor: '#1a1a2e',
  selection: 'rgba(37,99,235,0.15)',
  lineNumber: '#b0b0b0',
}

// ─── Types ───────────────────────────────────────────────────────────────────

type CopyMode = 'line' | 'all' | 'selection'

export interface TerminalViewRef {
  appendOutput: (text: string) => void
  clearOutput: () => void
  getOutput: () => string
  scrollToEnd: () => void
}

interface Props {
  /** Initial output text (controlled externally or via ref) */
  output?: string
  /** Placeholder when output is empty */
  placeholder?: string
  /** Show line numbers */
  showLineNumbers?: boolean
  /** Called when user taps AI assist and submits a prompt */
  onAiAssist?: (prompt: string, terminalOutput: string) => void
  /** Whether AI assist is available */
  aiAssistAvailable?: boolean
  /** Extra toolbar buttons rendered after built-in ones */
  extraToolbar?: React.ReactNode
}

// ─── Component ───────────────────────────────────────────────────────────────

const TerminalView = forwardRef<TerminalViewRef, Props>(function TerminalView(
  {
    output: controlledOutput,
    placeholder = 'Waiting for output...',
    showLineNumbers = false,
    onAiAssist,
    aiAssistAvailable = true,
    extraToolbar,
  },
  ref,
) {
  const { colors, isDark } = useTheme()

  // Terminal-specific dark/light toggle (independent of app theme)
  const [terminalDark, setTerminalDark] = useState(true)
  const termColors = terminalDark ? TERMINAL_DARK : TERMINAL_LIGHT

  // Internal output buffer (used when no controlled output)
  const [internalOutput, setInternalOutput] = useState('')
  const output = controlledOutput ?? internalOutput

  // Copy menu
  const [showCopyMenu, setShowCopyMenu] = useState(false)

  // AI assist
  const [showAiPrompt, setShowAiPrompt] = useState(false)
  const [aiPromptText, setAiPromptText] = useState('')
  const aiInputRef = useRef<TextInput>(null)

  const listRef = useRef<FlashListRef<string>>(null)

  // ─── Imperative handle ───────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    appendOutput: (text: string) => {
      setInternalOutput((prev) => prev + text)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50)
    },
    clearOutput: () => setInternalOutput(''),
    getOutput: () => controlledOutput ?? internalOutput,
    scrollToEnd: () => listRef.current?.scrollToEnd({ animated: true }),
  }))

  // ─── Copy logic ─────────────────────────────────────────────────────

  const lines = useMemo(() => output.split('\n'), [output])

  const handleCopy = useCallback(
    (mode: CopyMode) => {
      let text = ''
      switch (mode) {
        case 'all':
          text = output
          break
        case 'line':
          // Copy the last non-empty line (most recently active)
          text = [...lines].reverse().find((l) => l.trim()) ?? ''
          break
        case 'selection':
          // Copy last 20 lines as a "section" — user can adjust via native select
          text = lines.slice(-20).join('\n')
          break
      }
      RNClipboard.setString(text)
      setShowCopyMenu(false)
    },
    [output, lines],
  )

  // ─── AI assist ──────────────────────────────────────────────────────

  const handleAiSubmit = useCallback(() => {
    const prompt = aiPromptText.trim()
    if (!prompt || !onAiAssist) return
    onAiAssist(prompt, output)
    setAiPromptText('')
    setShowAiPrompt(false)
  }, [aiPromptText, onAiAssist, output])

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <View style={styles.wrapper}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Copy button */}
        <TouchableOpacity
          style={[styles.toolButton, { backgroundColor: colors.background }]}
          onPress={() => setShowCopyMenu(true)}
          activeOpacity={0.7}
        >
          <Copy color={colors.textSecondary} size={16} strokeWidth={2.2} />
          <Text style={[styles.toolButtonText, { color: colors.textSecondary }]}>Copy</Text>
        </TouchableOpacity>

        {/* Dark / Light toggle */}
        <TouchableOpacity
          style={[styles.toolButton, { backgroundColor: colors.background }]}
          onPress={() => setTerminalDark((d) => !d)}
          activeOpacity={0.7}
        >
          {terminalDark ? (
            <Sun color={colors.textSecondary} size={16} strokeWidth={2.2} />
          ) : (
            <Moon color={colors.textSecondary} size={16} strokeWidth={2.2} />
          )}
        </TouchableOpacity>

        {/* AI assist */}
        {onAiAssist && (
          <TouchableOpacity
            style={[
              styles.toolButton,
              {
                backgroundColor: aiAssistAvailable ? colors.accent : colors.background,
                opacity: aiAssistAvailable ? 1 : 0.5,
              },
            ]}
            onPress={() => {
              if (!aiAssistAvailable) return
              setShowAiPrompt(true)
              setTimeout(() => aiInputRef.current?.focus(), 300)
            }}
            activeOpacity={0.7}
            disabled={!aiAssistAvailable}
          >
            <Sparkles
              color={aiAssistAvailable ? colors.accentText : colors.textTertiary}
              size={16}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.toolButtonText,
                { color: aiAssistAvailable ? colors.accentText : colors.textTertiary },
              ]}
            >
              AI Assist
            </Text>
          </TouchableOpacity>
        )}

        {extraToolbar}
      </View>

      {/* Terminal output area */}
      <View style={[styles.terminal, { backgroundColor: termColors.bg }]}>
        <FlashList
          ref={listRef}
          data={lines}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) =>
            showLineNumbers ? (
              <View style={styles.lineRow}>
                <Text style={[styles.lineNumber, { color: termColors.lineNumber }]}>
                  {String(index + 1).padStart(3)}
                </Text>
                <Text style={[styles.terminalText, { color: termColors.text, flex: 1 }]} selectable>
                  {item}
                </Text>
              </View>
            ) : (
              <Text style={[styles.terminalText, { color: termColors.text }]} selectable>
                {item}
              </Text>
            )
          }
          contentContainerStyle={styles.terminalContent}
          ListEmptyComponent={
            <Text style={[styles.terminalText, { color: termColors.lineNumber }]}>
              {placeholder}
            </Text>
          }
        />
      </View>

      {/* ── Copy Menu Modal ──────────────────────────────────────────── */}
      <Modal visible={showCopyMenu} transparent animationType="fade" onRequestClose={() => setShowCopyMenu(false)}>
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowCopyMenu(false)}
        >
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Copy terminal output</Text>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.background }]}
              onPress={() => handleCopy('line')}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuItemText, { color: colors.text }]}>Last active line</Text>
              <Text style={[styles.menuItemHint, { color: colors.textTertiary }]}>
                Most recent non-empty line
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.background }]}
              onPress={() => handleCopy('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuItemText, { color: colors.text }]}>Entire screen</Text>
              <Text style={[styles.menuItemHint, { color: colors.textTertiary }]}>
                All terminal output
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.background }]}
              onPress={() => handleCopy('selection')}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuItemText, { color: colors.text }]}>Recent section</Text>
              <Text style={[styles.menuItemHint, { color: colors.textTertiary }]}>
                Last 20 lines
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCancel}
              onPress={() => setShowCopyMenu(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuCancelText, { color: colors.textTertiary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── AI Assist Prompt Modal ───────────────────────────────────── */}
      <Modal visible={showAiPrompt} transparent animationType="slide" onRequestClose={() => setShowAiPrompt(false)}>
        <TouchableOpacity
          style={styles.aiOverlay}
          activeOpacity={1}
          onPress={() => setShowAiPrompt(false)}
        >
          <View
            style={[styles.aiSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.aiHandle} />

            <View style={styles.aiHeader}>
              <Sparkles color={colors.accent} size={18} strokeWidth={2.2} />
              <Text style={[styles.aiTitle, { color: colors.text }]}>AI Assist</Text>
              <TouchableOpacity onPress={() => setShowAiPrompt(false)}>
                <X color={colors.textTertiary} size={20} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.aiDescription, { color: colors.textSecondary }]}>
              Describe the issue or ask a question. The current terminal output will be sent as context.
            </Text>

            <View style={[styles.aiInputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                ref={aiInputRef}
                style={[styles.aiInput, { color: colors.text }]}
                value={aiPromptText}
                onChangeText={setAiPromptText}
                placeholder="e.g. Why did chromium fail to install?"
                placeholderTextColor={colors.textTertiary}
                multiline
                returnKeyType="send"
                blurOnSubmit
                onSubmitEditing={handleAiSubmit}
              />
              <TouchableOpacity
                style={[
                  styles.aiSendButton,
                  { backgroundColor: aiPromptText.trim() ? colors.accent : colors.border },
                ]}
                onPress={handleAiSubmit}
                disabled={!aiPromptText.trim()}
                activeOpacity={0.7}
              >
                <Send color={colors.accentText} size={16} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Quick prompts */}
            <View style={styles.aiQuickRow}>
              {['Why did this fail?', 'How do I fix this?', 'Explain the error'].map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.aiQuickChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    setAiPromptText(q)
                    aiInputRef.current?.focus()
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.aiQuickText, { color: colors.textSecondary }]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
})

export default TerminalView

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  toolButtonText: {
    ...typographyScale.xs,
    fontWeight: '600',
  },

  // Terminal
  terminal: {
    flex: 1,
    borderRadius: borderRadius.lg,
    marginTop: spacing[1],
  },
  terminalContent: {
    padding: spacing[3],
    minHeight: '100%',
  },
  terminalText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  lineRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  lineNumber: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    width: 28,
    textAlign: 'right',
  },

  // Copy menu
  menuOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing[6],
  },
  menuCard: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[2],
  },
  menuTitle: {
    ...typographyScale.base,
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  menuItem: {
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    gap: 2,
  },
  menuItemText: {
    ...typographyScale.sm,
    fontWeight: '600',
  },
  menuItemHint: {
    ...typographyScale.xs,
  },
  menuCancel: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    marginTop: spacing[1],
  },
  menuCancelText: {
    ...typographyScale.sm,
    fontWeight: '500',
  },

  // AI assist
  aiOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  aiSheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: spacing[5],
    gap: spacing[3],
  },
  aiHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    alignSelf: 'center',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  aiTitle: {
    ...typographyScale.lg,
    fontWeight: '700',
    flex: 1,
  },
  aiDescription: {
    ...typographyScale.sm,
  },
  aiInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingLeft: spacing[3],
    paddingRight: spacing[1],
    paddingVertical: spacing[1],
    gap: spacing[2],
  },
  aiInput: {
    flex: 1,
    ...typographyScale.base,
    maxHeight: 100,
    paddingVertical: spacing[2],
  },
  aiSendButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  aiQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  aiQuickChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  aiQuickText: {
    ...typographyScale.xs,
    fontWeight: '500',
  },
})
