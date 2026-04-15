import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTheme } from '../contexts/ThemeContext'
import ConnectScreen from '../screens/ConnectScreen'
import ContainersScreen from '../screens/ContainersScreen'
import PlanScreen from '../screens/PlanScreen'
import ServerSetupScreen from '../screens/ServerSetupScreen'
import TaskDetailScreen from '../screens/TaskDetailScreen'
import NewTaskScreen from '../screens/NewTaskScreen'
import ProjectsScreen from '../screens/ProjectsScreen'
import GitHistoryScreen from '../screens/GitHistoryScreen'
import ServerDebugScreen from '../screens/ServerDebugScreen'
import MainTabs from './MainTabs'
import { useConnectionStore } from '../stores/connection'
import type { RootStackParamList } from './types'
import { typeStyles } from '../theme/typography'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)

  return (
    <Stack.Navigator
      initialRouteName={server ? 'Main' : 'Connect'}
      screenOptions={{
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: typeStyles.sectionTitle.fontFamily,
          fontSize: typeStyles.sectionTitle.fontSize,
          fontWeight: '800',
        },
      }}
    >
      <Stack.Screen
        name="Connect"
        component={ConnectScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ServerSetup"
        component={ServerSetupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{
          title: 'Task',
          presentation: 'transparentModal',
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="Containers"
        component={ContainersScreen}
        options={{ title: 'Containers' }}
      />
      <Stack.Screen
        name="Plan"
        component={PlanScreen}
        options={{ title: 'Plan' }}
      />
      <Stack.Screen
        name="NewTask"
        component={NewTaskScreen}
        options={{ title: 'New Task' }}
      />
      <Stack.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{ title: 'Repositories' }}
      />
      <Stack.Screen
        name="GitHistory"
        component={GitHistoryScreen}
        options={{ title: 'Commit History' }}
      />
      <Stack.Screen
        name="ServerDebug"
        component={ServerDebugScreen}
        options={{ title: 'Server Debug' }}
      />
    </Stack.Navigator>
  )
}
