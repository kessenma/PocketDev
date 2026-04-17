import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ArrowLeft, Info, Pin, PinOff, WrapText } from 'lucide-react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'

type Props = {
  wrapLines: boolean
  onToggleWrap: () => void
  onBack?: () => void
  contextSelected?: boolean
  onToggleContext?: () => void
  showSyntaxInfo?: boolean
  syntaxInfoVisible?: boolean
  onToggleSyntaxInfo?: () => void
}

export default function FileViewerToolbar({
  wrapLines,
  onToggleWrap,
  onBack,
  contextSelected = false,
  onToggleContext,
  showSyntaxInfo = false,
  syntaxInfoVisible = false,
  onToggleSyntaxInfo,
}: Props) {
  const { colors } = useTheme()

  return (
    <View style={styles.container}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to file browser"
          onPress={onBack}
          style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <ArrowLeft color={colors.text} size={16} strokeWidth={2.25} />
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Files</Text>
        </Pressable>
      ) : (
        <View />
      )}

      <View style={styles.actions}>
        {onToggleContext ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={contextSelected ? 'Remove file from AI context' : 'Add file to AI context'}
            onPress={onToggleContext}
            style={[
              styles.wrapButton,
              {
                backgroundColor: contextSelected ? colors.primary : colors.backgroundSecondary,
                borderColor: contextSelected ? colors.primary : colors.border,
              },
            ]}
          >
            {contextSelected ? (
              <PinOff color={contextSelected ? colors.primaryText : colors.textSecondary} size={16} strokeWidth={2.25} />
            ) : (
              <Pin color={contextSelected ? colors.primaryText : colors.textSecondary} size={16} strokeWidth={2.25} />
            )}
            <Text style={[styles.wrapButtonText, { color: contextSelected ? colors.primaryText : colors.text }]}>
              {contextSelected ? 'Pinned' : 'Pin'}
            </Text>
          </Pressable>
        ) : null}

        {showSyntaxInfo && onToggleSyntaxInfo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={syntaxInfoVisible ? 'Hide syntax highlighting info' : 'Show syntax highlighting info'}
            onPress={onToggleSyntaxInfo}
            style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
          >
            <Info color={colors.textSecondary} size={16} strokeWidth={2.25} />
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={wrapLines ? 'Turn line wrap off' : 'Turn line wrap on'}
          onPress={onToggleWrap}
          style={[
            styles.wrapButton,
            {
              backgroundColor: wrapLines ? colors.primary : colors.backgroundSecondary,
              borderColor: wrapLines ? colors.primary : colors.border,
            },
          ]}
        >
          <WrapText color={wrapLines ? colors.primaryText : colors.textSecondary} size={16} strokeWidth={2.25} />
          <Text style={[styles.wrapButtonText, { color: wrapLines ? colors.primaryText : colors.text }]}>
            {wrapLines ? 'Wrap on' : 'Wrap off'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  secondaryButtonText: {
    ...typeStyles.bodySmall,
  },
  wrapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  wrapButtonText: {
    ...typeStyles.bodySmall,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    width: 36,
    height: 36,
  },
})
