import React from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useConnectionStore } from '../../stores/connection'
import { useScriptsStore } from '../../stores/scripts'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import type { MainTabParamList } from '../../navigation/types'
import {
  getWorkspaceNavExpanded,
  setWorkspaceNavExpanded,
} from '../../services/storage'
import { renderTabIcon } from '../../navigation/tab-icons'
import { typeStyles } from '../../theme/typography'

const SIDEBAR_EXPANDED = 220
const SIDEBAR_COLLAPSED = 84

function getRouteLabel(
  routeName: string,
  options: BottomTabBarProps['descriptors'][string]['options'],
) {
  if (typeof options.tabBarLabel === 'string') return options.tabBarLabel
  if (typeof options.title === 'string') return options.title
  return routeName
}

export default function WorkspaceNavigation({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors } = useTheme()
  const status = useConnectionStore((s) => s.status)
  const [expanded, setExpanded] = React.useState(getWorkspaceNavExpanded)
  const width = React.useRef(
    new Animated.Value(expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED),
  ).current
  const labelOpacity = React.useRef(new Animated.Value(expanded ? 1 : 0)).current

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(width, {
        toValue: expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: expanded ? 1 : 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start()
    setWorkspaceNavExpanded(expanded)
  }, [expanded, labelOpacity, width])

  const runningCount = useScriptsStore((s) => {
    let count = 0
    for (const entry of s.runningScripts.values()) {
      if (entry.status === 'starting' || entry.status === 'running') count++
    }
    return count
  })

  const statusColor =
    status === 'connected'
      ? '#22c55e'
      : status === 'connecting'
        ? '#facc15'
        : '#ef4444'

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width,
          backgroundColor: colors.panel,
          borderRightColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse workspace navigation' : 'Expand workspace navigation'}
        activeOpacity={0.7}
        onPress={() => setExpanded((current) => !current)}
        style={[styles.toggleButton, { borderBottomColor: colors.border }]}
      >
        {expanded ? (
          <ChevronLeft color={colors.textSecondary} size={18} strokeWidth={2.25} />
        ) : (
          <ChevronRight color={colors.textSecondary} size={18} strokeWidth={2.25} />
        )}
        {expanded ? (
          <Animated.Text
            numberOfLines={1}
            style={[styles.toggleLabel, { color: colors.textSecondary, opacity: labelOpacity }]}
          >
            Workspace
          </Animated.Text>
        ) : null}
      </TouchableOpacity>

      <View style={styles.tabList}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index
          const options = descriptors[route.key].options
          const label = getRouteLabel(route.name, options)

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params)
            }
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              activeOpacity={0.7}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={[
                styles.tabItem,
                {
                  backgroundColor: isFocused ? colors.panelAlt : 'transparent',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.iconBoxWrapper}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isFocused ? colors.primary : colors.panelAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {renderTabIcon(route.name as keyof MainTabParamList, {
                    color: isFocused ? colors.primaryText : colors.textSecondary,
                    size: 18,
                  })}
                </View>
                {route.name === 'Code' && runningCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#22c55e' }]}>
                    <Text style={styles.badgeText}>{runningCount}</Text>
                  </View>
                )}
              </View>

              {expanded ? (
                <Animated.Text
                  numberOfLines={1}
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused ? colors.primary : colors.text,
                      opacity: labelOpacity,
                    },
                  ]}
                >
                  {label}
                </Animated.Text>
              ) : null}
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          {expanded ? (
            <Animated.Text
              numberOfLines={1}
              style={[styles.statusText, { color: colors.textSecondary, opacity: labelOpacity }]}
            >
              {status}
            </Animated.Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    borderRightWidth: 2,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 2,
  },
  toggleLabel: {
    ...typeStyles.meta,
  },
  tabList: {
    flex: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  tabItem: {
    minHeight: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[3],
  },
  iconBoxWrapper: {
    position: 'relative',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  tabLabel: {
    ...typeStyles.labelStrong,
    flexShrink: 1,
  },
  footer: {
    borderTopWidth: 2,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusDot: {
    width: 8,
    height: 8,
  },
  statusText: {
    ...typeStyles.meta,
    textTransform: 'capitalize',
  },
})
