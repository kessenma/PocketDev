import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View, StyleSheet } from 'react-native'
import { borderRadius, spacing } from '@pocketdev/shared/theme'
import { useTheme } from '../contexts/ThemeContext'
import TasksScreen from '../screens/TasksScreen'
import CodeScreen from '../screens/CodeScreen'
import SettingsScreen from '../screens/SettingsScreen'
import { useConnectionStore } from '../stores/connection'
import type { MainTabParamList } from './types'
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout'
import WorkspaceNavigation from '../components/navigation/WorkspaceNavigation'
import { renderTabIcon } from './tab-icons'
import { typeStyles } from '../theme/typography'

const Tab = createBottomTabNavigator<MainTabParamList>()

function StatusDot() {
  const { colors } = useTheme()
  const status = useConnectionStore((s) => s.status)
  const color =
    status === 'connected'
      ? '#22c55e'
      : status === 'connecting'
        ? '#facc15'
        : '#ef4444'

  return (
    <View style={[styles.statusPill, { borderColor: colors.border, backgroundColor: colors.panelAlt }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[typeStyles.meta, { color: colors.text }]}>{status}</Text>
    </View>
  )
}

function renderWorkspaceTabBar(
  props: React.ComponentProps<typeof WorkspaceNavigation>,
) {
  return <WorkspaceNavigation {...props} />
}

function renderStatusDot() {
  return <StatusDot />
}

export default function MainTabs() {
  const { colors } = useTheme()
  const { isTabletDevice } = useAdaptiveLayout()

  return (
    <Tab.Navigator
      tabBar={isTabletDevice ? renderWorkspaceTabBar : undefined}
      screenOptions={{
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: isTabletDevice
          ? { display: 'none' }
          : {
              backgroundColor: colors.panel,
              borderTopColor: colors.border,
              borderTopWidth: 2,
              height: 72,
              paddingBottom: spacing[2],
              paddingTop: spacing[2],
            },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: typeStyles.meta,
        tabBarItemStyle: { borderRadius: borderRadius.md, marginHorizontal: spacing[1] },
      }}
    >
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => renderTabIcon('Tasks', { color, size }),
        }}
      />
      <Tab.Screen
        name="Code"
        component={CodeScreen}
        options={{
          title: 'Code',
          tabBarIcon: ({ color, size }) => renderTabIcon('Code', { color, size }),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => renderTabIcon('Settings', { color, size }),
          headerRight: renderStatusDot,
          headerRightContainerStyle: { paddingRight: 16 },
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  dot: {
    width: 10,
    height: 10,
  },
})
