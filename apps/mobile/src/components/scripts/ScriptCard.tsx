import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Play, Square, Eye, ChevronDown, ChevronUp, X, CircleCheck, CircleX, Send } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import CopyButton from '../ui/CopyButton'
import type { ScriptRunStatus } from '../../stores/scripts'
import { typeStyles } from '../../theme/typography'

type Props = {
  name: string
  command: string
  status: ScriptRunStatus | null
  detectedPort: number | null
  outputLines: string[]
  onRun: () => void
  onStop: () => void
  onDismiss: () => void
  onPreview: (port: number) => void
  onSendInput?: (text: string) => void
}

const MAX_VISIBLE_LINES = 80

export default function ScriptCard({
  name,
  command,
  status,
  detectedPort,
  outputLines,
  onRun,
  onStop,
  onDismiss,
  onPreview,
  onSendInput,
}: Props) {
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const [inputText, setInputText] = useState('')
  const scrollRef = useRef<ScrollView>(null)

  const isActive = status === 'starting' || status === 'running'
  const isDone = status === 'completed' || status === 'failed'
  const hasOutput = outputLines.length > 0

  function handleSendInput() {
    if (!inputText.trim() || !onSendInput) return
    onSendInput(inputText + '\n')
    setInputText('')
  }

  // Auto-expand when script starts producing output
  useEffect(() => {
    if (isActive && hasOutput && !expanded) {
      setExpanded(true)
    }
  }, [isActive, hasOutput])

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (expanded && hasOutput) {
      scrollRef.current?.scrollToEnd({ animated: false })
    }
  }, [expanded, outputLines.length])

  const visibleLines = outputLines.slice(-MAX_VISIBLE_LINES)
  const fullOutput = visibleLines.join('\n')

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={hasOutput ? () => setExpanded((v) => !v) : undefined}
          disabled={!hasOutput}
          style={styles.info}
        >
          <View style={styles.nameRow}>
            {isDone && (
              status === 'completed'
                ? <CircleCheck color="#22c55e" size={14} strokeWidth={2.25} />
                : <CircleX color={colors.accentRed} size={14} strokeWidth={2.25} />
            )}
            {isActive && (
              <ActivityIndicator color={colors.primary} size={12} />
            )}
            <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
            {hasOutput && (
              expanded
                ? <ChevronUp color={colors.textTertiary} size={14} strokeWidth={2} />
                : <ChevronDown color={colors.textTertiary} size={14} strokeWidth={2} />
            )}
          </View>
          <Text style={[styles.command, { color: colors.textSecondary }]} numberOfLines={1}>
            {command}
          </Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          {detectedPort != null && (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={() => onPreview(detectedPort)}
              style={[styles.previewButton, { backgroundColor: colors.accentBlue }]}
            >
              <Eye color={colors.primaryText} size={14} strokeWidth={2.5} />
              <Text style={[styles.buttonText, { color: colors.primaryText }]}>Preview</Text>
            </TouchableOpacity>
          )}

          {isActive ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={onStop}
              style={[styles.actionButton, { backgroundColor: colors.accentRed }]}
            >
              <Square color={colors.primaryText} size={14} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : isDone ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={onDismiss}
              style={[styles.actionButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1 }]}
            >
              <X color={colors.textSecondary} size={14} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={onRun}
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
            >
              <Play color={colors.primaryText} size={14} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {expanded && hasOutput && (
        <View style={styles.outputContainer}>
          <ScrollView
            ref={scrollRef}
            style={[styles.outputBox, { backgroundColor: colors.background }]}
            nestedScrollEnabled
          >
            {visibleLines.map((line, i) => (
              <Text
                key={i}
                style={[styles.outputLine, { color: colors.textSecondary }]}
                selectable
              >
                {line}
              </Text>
            ))}
          </ScrollView>
          <CopyButton value={fullOutput} label="Copy output" style={styles.copyButton} />
          {isActive && onSendInput && (
            <View style={[styles.inputRow, { backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.inputField, { color: colors.text }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type input…"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="send"
                onSubmitEditing={handleSendInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSendInput}
                style={[styles.sendButton, { backgroundColor: colors.primary }]}
              >
                <Send color={colors.primaryText} size={14} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  name: {
    ...typeStyles.bodyBold,
  },
  command: {
    ...typeStyles.meta,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    height: 36,
  },
  buttonText: {
    ...typeStyles.meta,
  },
  outputContainer: {
    gap: spacing[2],
  },
  outputBox: {
    maxHeight: 200,
    borderRadius: borderRadius.md,
    padding: spacing[2],
  },
  outputLine: {
    ...typeStyles.mono,
  },
  copyButton: {
    alignSelf: 'flex-start',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    gap: spacing[2],
    height: 36,
  },
  inputField: {
    flex: 1,
    ...typeStyles.mono,
  },
  sendButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
