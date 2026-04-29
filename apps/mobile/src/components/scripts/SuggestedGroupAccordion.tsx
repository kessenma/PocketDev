import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ChevronDown, ChevronUp, Play, RotateCcw, Square } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'
import type { ActionGroup, ActionTarget } from './model'
import type { RunningScript } from '../../stores/scripts'

type Props = {
  group: ActionGroup
  runningScripts: Map<string, RunningScript>
  onRun: (target: ActionTarget) => void
  onStop: (key: string) => void
}

function runKey(target: ActionTarget): string {
  return `${target.packagePath}:${target.id}`
}

export default function SuggestedGroupAccordion({ group, runningScripts, onRun, onStop }: Props) {
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState(false)

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={[styles.label, { color: colors.text }]}>{group.label}</Text>
        {expanded
          ? <ChevronUp color={colors.textTertiary} size={15} strokeWidth={2} />
          : <ChevronDown color={colors.textTertiary} size={15} strokeWidth={2} />
        }
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.body, { borderTopColor: colors.border }]}>
          {group.targets.map((target, index) => {
            const key = runKey(target)
            const entry = runningScripts.get(key)
            const status = entry?.status ?? null
            const isRunning = status === 'starting' || status === 'running'
            const isDone = status === 'completed'
            const isFailed = status === 'failed'
            const isLast = index === group.targets.length - 1

            return (
              <View
                key={target.id}
                style={[
                  styles.row,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.rowInfo}>
                  <Text style={[styles.targetLabel, { color: colors.text }]}>{target.label}</Text>
                  <Text
                    style={[styles.command, { color: colors.textTertiary }]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {target.command}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.btn,
                    isRunning && { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
                    !isRunning && { backgroundColor: isDone ? colors.success : isFailed ? colors.accentRed : colors.primary },
                  ]}
                  onPress={() => isRunning ? onStop(key) : onRun(target)}
                  activeOpacity={0.8}
                >
                  {isRunning
                    ? <Square color={colors.text} size={11} fill={colors.text} />
                    : isDone
                      ? <RotateCcw color={colors.primaryText} size={12} strokeWidth={2.5} />
                      : <Play color={colors.primaryText} size={12} fill={colors.primaryText} />
                  }
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  label: {
    ...typeStyles.bodyBold,
  },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  targetLabel: {
    ...typeStyles.body,
  },
  command: {
    ...typeStyles.monoLabel,
    textTransform: undefined,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
