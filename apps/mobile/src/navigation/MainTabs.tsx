import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import TasksScreen from '../screens/TasksScreen'
import FilesScreen from '../screens/FilesScreen'
import ServerScreen from '../screens/ServerScreen'
import NewTaskScreen from '../screens/NewTaskScreen'
import SettingsScreen from '../screens/SettingsScreen'
import { useConnectionStore } from '../stores/connection'
import type { MainTabParamList } from './types'
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout'
import WorkspaceNavigation from '../components/navigation/WorkspaceNavigation'
import { renderTabIcon } from './tab-icons'

const Tab = createBottomTabNavigator<MainTabParamList>()

function StatusDot() {
  const status = useConnectionStore((s) => s.status)
  const color =
    status === 'connected'
      ? '#22c55e'
      : status === 'connecting'
        ? '#facc15'
        : '#ef4444'

  return <View style={[styles.dot, { backgroundColor: color }]} />
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
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: isTabletDevice
          ? { display: 'none' }
          : { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
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
        name="Files"
        component={FilesScreen}
        options={{
          title: 'Files',
          tabBarIcon: ({ color, size }) => renderTabIcon('Files', { color, size }),
        }}
      />
      <Tab.Screen
        name="Server"
        component={ServerScreen}
        options={{
          title: 'Server',
          tabBarIcon: ({ color, size }) => renderTabIcon('Server', { color, size }),
        }}
      />
      <Tab.Screen
        name="NewTask"
        component={NewTaskScreen}
        options={{
          title: 'New Task',
          tabBarIcon: ({ color, size }) => renderTabIcon('NewTask', { color, size }),
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
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})
