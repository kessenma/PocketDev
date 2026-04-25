import React from 'react'
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { getRecentPrompts } from '../../services/storage'
import { typeStyles } from '../../theme/typography'
import { Assets } from '../../../assets'

function getAgentLogo(agentType: string, isDark: boolean) {
  switch (agentType) {
    case 'claude': return isDark ? Assets.claudeWhite : Assets.claudeBlack
    case 'codex': return isDark ? Assets.codexWhite : Assets.codexBlack
    case 'copilot': return isDark ? Assets.githubCopilotWhite : Assets.githubCopilotBlack
    case 'minimax':
    case 'opencode': return isDark ? Assets.minimaxWhite : Assets.minimaxBlack
    default: return null
  }
}

type Props = {
  onPromptPress: (prompt: string, agentType: string) => void
}

export default function RecentPromptsPane({ onPromptPress }: Props) {
  const { colors, isDark } = useTheme()
  const prompts = getRecentPrompts()

  if (prompts.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No recent prompts</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Prompts from tasks you start will appear here.
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      data={prompts}
      keyExtractor={(item, i) => `${item.agentType}-${i}`}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const logo = getAgentLogo(item.agentType, isDark)
        return (
          <Pressable
            style={[styles.item, { backgroundColor: colors.panel, borderColor: colors.border }]}
            onPress={() => onPromptPress(item.prompt, item.agentType)}
          >
            {logo ? <Image source={logo} style={styles.logo} /> : null}
            <Text style={[styles.text, { color: colors.text }]} numberOfLines={3}>
              {item.prompt}
            </Text>
          </Pressable>
        )
      }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  )
}

const styles = StyleSheet.create({
  list: {
    padding: spacing[4],
  },
  separator: {
    height: spacing[3],
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    borderWidth: 2,
    borderRadius: borderRadius.lg,
  },
  logo: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    marginTop: 2,
    flexShrink: 0,
  },
  text: {
    ...typeStyles.body,
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  emptyTitle: {
    ...typeStyles.screenTitle,
  },
  emptySubtitle: {
    ...typeStyles.body,
    textAlign: 'center',
    marginTop: spacing[2],
    maxWidth: 320,
  },
})
