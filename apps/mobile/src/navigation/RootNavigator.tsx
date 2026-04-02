import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTheme } from '../contexts/ThemeContext'
import ConnectScreen from '../screens/ConnectScreen'
import ContainersScreen from '../screens/ContainersScreen'
import PlanScreen from '../screens/PlanScreen'
import ServerSetupScreen from '../screens/ServerSetupScreen'
import TaskDetailScreen from '../screens/TaskDetailScreen'
import MainTabs from './MainTabs'
import { useConnectionStore } from '../stores/connection'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  const { colors } = useTheme()
  const server = useConnectionStore((s) => s.server)

  return (
    <Stack.Navigator
      initialRouteName={server ? 'Main' : 'Connect'}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
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
        options={{ title: 'Task' }}
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
    </Stack.Navigator>
  )
}
