import React from 'react'
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { getRecentPrompts } from '../../services/storage'
import { typeStyles } from '../../theme/typography'
import { Assets } from '../../../assets'

const BADGE_SIZE = 32
const BADGE_OFFSET = BADGE_SIZE / 2

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
          <View style={styles.cardWrapper}>
            <Pressable
              style={[styles.item, { backgroundColor: colors.panel, borderColor: colors.border }]}
              onPress={() => onPromptPress(item.prompt, item.agentType)}
            >
              <Text style={[styles.text, { color: colors.text }]} numberOfLines={3}>
                {item.prompt}
              </Text>
            </Pressable>
            {logo ? (
              <View style={styles.badge}>
                <View style={[styles.badgeMask, { backgroundColor: colors.panel }]} />
                <Image source={logo} style={styles.badgeLogo} />
              </View>
            ) : null}
          </View>
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
  cardWrapper: {
    marginTop: BADGE_OFFSET,
  },
  item: {
    padding: spacing[4],
    paddingTop: spacing[3],
    borderWidth: 2,
    borderRadius: borderRadius.lg,
  },
  badge: {
    position: 'absolute',
    top: -BADGE_OFFSET,
    left: spacing[3],
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  badgeMask: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BADGE_OFFSET,
  },
  badgeLogo: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  text: {
    ...typeStyles.body,
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
