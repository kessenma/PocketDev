import React, { type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import ReanimatedLib, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated'
import { spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../../contexts/ThemeContext'
import { typeStyles } from '../../theme/typography'
import CodeSubTabNavigator from '../code-screen/navigation/CodeSubTabNavigator'
import type { CodeSubTabOption } from '../code-screen/navigation/types'

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useShrinkableHeader(onScroll?: (...args: any[]) => void) {
  const scrollY = useSharedValue(0)

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y
      if (onScroll) {
        runOnJS(onScroll)(event as any)
      }
    },
  })

  return { scrollY, scrollHandler }
}

// ---------------------------------------------------------------------------
// Component types
// ---------------------------------------------------------------------------

type TabsConfig<T extends string> = {
  value: T
  options: readonly CodeSubTabOption<T>[]
  onChange: (value: T) => void
  /** 'all' — all tabs show label (default). 'active-only' — only the selected tab shows label. */
  labelMode?: 'all' | 'active-only'
  /** Wrap tabs in a horizontal ScrollView for many items */
  scrollable?: boolean
  /** 'pill' — fully rounded (default). 'segmented' — square corners, active indicator overlaps container border. */
  variant?: 'pill' | 'segmented'
  /** Sibling element beside the tab pill (e.g., a History icon button) */
  extra?: ReactNode
}

type Props<T extends string = string> = {
  scrollY: SharedValue<number>

  // ── Standard hero ──────────────────────────────────────────────────────
  title?: string
  subtitle?: string
  /** ReactNode rendered to the right of title/subtitle */
  accessories?: ReactNode

  // ── Custom hero override (user manages animations via scrollY) ─────────
  hero?: ReactNode

  // ── Sub-tab navigator ──────────────────────────────────────────────────
  tabs?: TabsConfig<T>

  // ── Status line below tabs ─────────────────────────────────────────────
  statusLine?: string

  /** Stable content rendered between hero and tabs */
  children?: ReactNode
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShrinkableHeader<T extends string = string>({
  scrollY,
  title,
  subtitle,
  accessories,
  hero,
  tabs,
  statusLine,
  children,
}: Props<T>) {
  const { colors, isDark } = useTheme()

  // Measured natural height of the hero — 0 means not yet measured.
  const heroNaturalHeight = useSharedValue(0)

  // 0..1 value: 0 = expanded, 1 = fully compact (icon-only tabs)
  const compact = useDerivedValue(() =>
    interpolate(scrollY.value, [60, 120], [0, 1], 'clamp'),
  )

  const heroAnimStyle = useAnimatedStyle(() => {
    const naturalH = heroNaturalHeight.value
    const opacity = interpolate(scrollY.value, [0, 60], [1, 0], 'clamp')
    // Before layout measurement, let content flow naturally (no height clamp)
    if (naturalH === 0) return { opacity }
    return {
      height: interpolate(scrollY.value, [0, 100], [naturalH, 0], 'clamp'),
      opacity,
      overflow: 'hidden',
    }
  })

  const tabSpacerStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, 80], [spacing[3], 0], 'clamp'),
  }))

  const statusAnimStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, 60], [18, 0], 'clamp'),
    opacity: interpolate(scrollY.value, [0, 60], [1, 0], 'clamp'),
    overflow: 'hidden',
  }))

  const hasStandardHero = title !== undefined || subtitle !== undefined || accessories !== undefined
  const hasHero = hero !== undefined || hasStandardHero

  return (
    <ReanimatedLib.View
      style={[
        styles.headerCard,
        {
          backgroundColor: isDark ? 'rgba(14, 14, 14, 0.9)' : 'rgba(250, 248, 242, 0.96)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(26, 26, 26, 0.08)',
        },
      ]}
    >
      {hasHero ? (
        <ReanimatedLib.View
          style={heroAnimStyle}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height
            if (h > 0 && heroNaturalHeight.value === 0) {
              heroNaturalHeight.value = h
            }
          }}
        >
          {hero ?? (
            <View style={styles.standardHero}>
              <View style={styles.heroBody}>
                {title !== undefined ? (
                  <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={1}>
                    {title}
                  </Text>
                ) : null}
                {subtitle !== undefined ? (
                  <Text style={[styles.heroSubtitle, { color: colors.textTertiary }]} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {accessories ? <View style={styles.heroAccessories}>{accessories}</View> : null}
            </View>
          )}
        </ReanimatedLib.View>
      ) : null}

      {children}

      {hasHero && tabs ? <ReanimatedLib.View style={tabSpacerStyle} /> : null}

      {tabs ? (
        <View style={[styles.tabSection, tabs.extra ? styles.tabRow : null]}>
          <CodeSubTabNavigator
            value={tabs.value}
            options={tabs.options}
            onChange={tabs.onChange}
            compact={compact}
            labelMode={tabs.labelMode}
            scrollable={tabs.scrollable}
            variant={tabs.variant}
          />
          {tabs.extra ?? null}
        </View>
      ) : null}

      {statusLine !== undefined ? (
        <ReanimatedLib.View style={statusAnimStyle}>
          <Text style={[styles.statusLine, { color: colors.textTertiary }]} numberOfLines={1}>
            {statusLine}
          </Text>
        </ReanimatedLib.View>
      ) : null}
    </ReanimatedLib.View>
  )
}

const styles = StyleSheet.create({
  headerCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  standardHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  heroBody: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    ...typeStyles.heading,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    ...typeStyles.meta,
  },
  heroAccessories: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  tabSection: {
    alignSelf: 'stretch',
    marginRight: -spacing[3],
    marginLeft: -spacing[3],
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusLine: {
    ...typeStyles.meta,
    paddingHorizontal: spacing[1],
  },
})
