import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  ChevronDown,
  ChevronUp,
  FileEdit,
  FilePlus,
  FileText,
  Terminal,
  Trash2,
} from 'lucide-react-native'
import { EnrichedMarkdownText } from 'react-native-enriched-markdown'
import { spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import { buildMarkdownStyle } from '../../theme/markdown'
import Badge from '../ui/Badge'
import { Card, CardContent, CardHeader } from '../ui/Card'
import type { PlanStep, PlanStepKind } from './model'

type StepMeta = {
  label: string
  Icon: React.ComponentType<{ color: string; size: number; strokeWidth: number }>
  getColor: (colors: any) => string
}

const STEP_META: Record<PlanStepKind, StepMeta> = {
  create: {
    label: 'Create',
    Icon: FilePlus,
    getColor: (colors) => colors.accentGreen,
  },
  modify: {
    label: 'Modify',
    Icon: FileEdit,
    getColor: (colors) => colors.accentBlue,
  },
  delete: {
    label: 'Delete',
    Icon: Trash2,
    getColor: (colors) => colors.accentRed,
  },
  run: {
    label: 'Run',
    Icon: Terminal,
    getColor: (colors) => colors.accentYellow,
  },
  note: {
    label: 'Note',
    Icon: FileText,
    getColor: (colors) => colors.textTertiary,
  },
}

type Props = {
  steps: PlanStep[]
}

export default function PlanStepList({ steps }: Props) {
  return (
    <View style={styles.list}>
      {steps.map((step, index) => (
        <StepCard key={step.id} step={step} index={index} />
      ))}
    </View>
  )
}

function StepCard({ step, index }: { step: PlanStep; index: number }) {
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState(true)
  const meta = STEP_META[step.kind]
  const accentColor = meta.getColor(colors)
  const { Icon } = meta

  return (
    <Card accentColor={accentColor}>
      <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
        <CardHeader style={styles.header}>
          <Icon color={accentColor} size={14} strokeWidth={2.25} />
          <Text style={[styles.kindLabel, { color: accentColor }]}>{meta.label}</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={expanded ? undefined : 1}>
            {step.title}
          </Text>
          <Badge label={String(index + 1)} color={accentColor} />
          <View style={styles.spacer} />
          {expanded
            ? <ChevronUp color={colors.textTertiary} size={14} strokeWidth={2.25} />
            : <ChevronDown color={colors.textTertiary} size={14} strokeWidth={2.25} />}
        </CardHeader>
      </Pressable>

      {expanded && (
        <CardContent style={styles.body}>
          {step.filePath ? (
            <Text style={[styles.filePath, { color: accentColor }]}>{step.filePath}</Text>
          ) : null}
          <EnrichedMarkdownText
            markdown={step.description}
            markdownStyle={buildMarkdownStyle(colors)}
          />
        </CardContent>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'nowrap',
  },
  kindLabel: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  title: {
    ...typeStyles.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  spacer: {
    flex: 0,
  },
  body: {
    gap: spacing[2],
  },
  filePath: {
    ...typeStyles.meta,
    fontWeight: '600',
  },
})
