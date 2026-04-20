import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { EnrichedMarkdownText } from 'react-native-enriched-markdown'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import type { TaskTurn } from '@pocketdev/shared/types'
import { MessageSquare, User } from 'lucide-react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'
import { buildMarkdownStyle } from '../../theme/markdown'

type Props = {
  turns: TaskTurn[]
}

export default function TaskConversation({ turns }: Props) {
  const { colors } = useTheme()

  if (turns.length === 0) return null

  return (
    <View style={styles.container}>
      {turns.map((turn) => {
        const isUser = turn.role === 'user'

        return (
          <View
            key={turn.id}
            style={[
              styles.bubble,
              isUser ? styles.userBubble : styles.assistantBubble,
              {
                backgroundColor: isUser
                  ? colors.primary
                  : colors.panelAlt,
                borderColor: isUser ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={styles.roleRow}>
              {isUser ? (
                <User color={colors.primaryText} size={12} strokeWidth={2.5} />
              ) : (
                <MessageSquare color={colors.primary} size={12} strokeWidth={2.5} />
              )}
              <Text style={[styles.roleLabel, { color: isUser ? colors.primaryText : colors.primary }]}>
                {isUser ? 'You' : 'Assistant'}
              </Text>
              <Text style={[styles.turnLabel, { color: isUser ? colors.primaryText : colors.textTertiary }]}>
                Turn {turn.turn_number}
              </Text>
            </View>
            {isUser ? (
              <Text
                style={[styles.content, { color: colors.primaryText }]}
                numberOfLines={4}
              >
                {turn.content}
              </Text>
            ) : (
              <EnrichedMarkdownText
                markdown={turn.content}
                markdownStyle={buildMarkdownStyle(colors)}
              />
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  bubble: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[3],
    maxWidth: '90%',
    gap: spacing[1],
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  roleLabel: {
    ...typeStyles.meta,
    fontWeight: '700',
  },
  turnLabel: {
    ...typeStyles.meta,
    marginLeft: 'auto',
  },
  content: {
    ...typeStyles.body,
  },
})
