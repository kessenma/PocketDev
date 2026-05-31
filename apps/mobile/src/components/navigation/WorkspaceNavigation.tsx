import React, { useEffect, useState } from 'react'
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { useConnectionStore } from '../../stores/connection'
import { useScriptsStore } from '../../stores/scripts'
import { ArrowLeftFromLine, ArrowRightFromLine } from 'lucide-react-native'
import type { MainTabParamList } from '../../navigation/types'
import {
  getWorkspaceNavExpanded,
  setWorkspaceNavExpanded,
} from '../../services/storage'
import { renderTabIcon } from '../../navigation/tab-icons'
import { typeStyles } from '../../theme/typography'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
  const insets = useSafeAreaInsets()
  const status = useConnectionStore((s) => s.status)
  const [expanded, setExpanded] = useState(getWorkspaceNavExpanded)

  const labelProgress = useSharedValue(expanded ? 1 : 0)

  useEffect(() => {
    // LayoutAnimation drives the width change through the JS-thread layout system so
    // React Navigation's flex row actually reflows the adjacent screen content.
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))
    labelProgress.value = withTiming(expanded ? 1 : 0, { duration: 180 })
    setWorkspaceNavExpanded(expanded)
  }, [expanded, labelProgress])

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelProgress.value,
    maxWidth: interpolate(labelProgress.value, [0, 1], [0, 150], Extrapolation.CLAMP),
    overflow: 'hidden' as const,
  }))

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
    <View
      style={[
        styles.container,
        {
          width: expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED,
          backgroundColor: colors.panel,
          borderRightColor: colors.border,
          paddingTop: insets.top + spacing[6],
          paddingBottom: insets.bottom + spacing[4],
        },
      ]}
    >
      {/* Header label */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Animated.Text
          numberOfLines={1}
          style={[styles.headerLabel, { color: colors.textTertiary }, labelStyle]}
        >
          WORKSPACE
        </Animated.Text>
      </View>

      {/* Nav items */}
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

              <Animated.Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  { color: isFocused ? colors.primary : colors.text },
                  isFocused && { fontWeight: '700' },
                  labelStyle,
                ]}
              >
                {label}
              </Animated.Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Footer — status + expand/collapse toggle */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Animated.Text
            numberOfLines={1}
            style={[styles.statusText, { color: colors.textSecondary }, labelStyle]}
          >
            {status}
          </Animated.Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse workspace navigation' : 'Expand workspace navigation'}
          activeOpacity={0.7}
          onPress={() => setExpanded((prev) => !prev)}
          style={styles.toggleButton}
        >
          {expanded ? (
            <ArrowLeftFromLine color={colors.textSecondary} size={18} strokeWidth={2.25} />
          ) : (
            <ArrowRightFromLine color={colors.textSecondary} size={18} strokeWidth={2.25} />
          )}
          <Animated.Text
            numberOfLines={1}
            style={[styles.toggleLabel, { color: colors.textSecondary }, labelStyle]}
          >
            Collapse
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    borderRightWidth: 2,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 2,
    overflow: 'hidden',
  },
  headerLabel: {
    ...typeStyles.meta,
    fontWeight: '700',
    letterSpacing: 1.3,
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
    overflow: 'hidden',
  },
  iconBoxWrapper: {
    position: 'relative',
    flexShrink: 0,
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
  },
  footer: {
    borderTopWidth: 2,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    overflow: 'hidden',
  },
  statusDot: {
    width: 8,
    height: 8,
    flexShrink: 0,
  },
  statusText: {
    ...typeStyles.meta,
    textTransform: 'capitalize',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    overflow: 'hidden',
  },
  toggleLabel: {
    ...typeStyles.meta,
  },
})
