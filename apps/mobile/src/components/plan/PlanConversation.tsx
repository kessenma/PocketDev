import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { EnrichedMarkdownText } from 'react-native-enriched-markdown'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { typeStyles } from '../../theme/typography'
import { useTheme } from '../../contexts/ThemeContext'
import { PlanCard, PlanCardContent, PlanCardDescription, PlanCardHeader, PlanCardTitle } from './PlanCard'
import type { PlanMessage } from './model'

type Props = {
  messages: PlanMessage[]
  onSend: (text: string) => void
}

export default function PlanConversation({ messages, onSend }: Props) {
  const { colors } = useTheme()
  const [draft, setDraft] = useState('')

  function handleSend() {
    const trimmed = draft.trim()
    if (!trimmed) return
    onSend(trimmed)
    setDraft('')
  }

  return (
    <PlanCard style={styles.card}>
      <PlanCardHeader>
        <PlanCardTitle>Conversation</PlanCardTitle>
        <PlanCardDescription>Discuss the plan with the agent before accepting or denying.</PlanCardDescription>
      </PlanCardHeader>

      <PlanCardContent>
        <View style={styles.thread}>
          {messages.map((msg) => {
            const isAgent = msg.role === 'agent'

            return (
              <View
                key={msg.id}
                style={[
                  styles.bubble,
                  isAgent ? styles.agentBubble : styles.userBubble,
                  {
                    backgroundColor: isAgent
                      ? colors.backgroundSecondary
                      : colors.primary,
                  },
                ]}
              >
                <EnrichedMarkdownText
                  markdown={msg.text}
                  markdownStyle={{
                    paragraph: {
                      color: isAgent ? colors.text : colors.primaryText,
                      fontSize: 14,
                      lineHeight: 20,
                    },
                    strong: {
                      color: isAgent ? colors.text : colors.primaryText,
                    },
                    link: { color: isAgent ? colors.primary : colors.primaryText },
                    code: {
                      color: isAgent ? colors.primary : colors.primaryText,
                      backgroundColor: isAgent ? colors.background : 'rgba(255,255,255,0.15)',
                    },
                  }}
                />
                <Text
                  style={[
                    styles.timestamp,
                    { color: isAgent ? colors.textTertiary : colors.primaryText },
                  ]}
                >
                  {msg.relativeTime}
                </Text>
              </View>
            )
          })}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Reply to the agent..."
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!draft.trim()}
            onPress={handleSend}
            style={[
              styles.sendButton,
              { backgroundColor: draft.trim() ? colors.primary : colors.border },
            ]}
          >
            <Text style={[styles.sendText, { color: colors.primaryText }]}>Send</Text>
          </TouchableOpacity>
        </View>
      </PlanCardContent>
    </PlanCard>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  thread: {
    gap: spacing[2],
  },
  bubble: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    maxWidth: '85%',
    gap: spacing[1],
  },
  agentBubble: {
    alignSelf: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  timestamp: {
    ...typeStyles.meta,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'flex-end',
  },
  input: {
    ...typeStyles.bodySmall,
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  sendButton: {
    minHeight: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  sendText: {
    ...typeStyles.bodySmall,
    fontWeight: '700',
  },
})
