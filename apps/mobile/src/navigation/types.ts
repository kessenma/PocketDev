import type { NavigatorScreenParams } from '@react-navigation/native'

export type RootStackParamList = {
  Connect: { url?: string } | undefined
  ServerSetup: undefined
  Main: NavigatorScreenParams<MainTabParamList> | undefined
  TaskDetail: { taskId: string }
  Containers: undefined
  Plan: undefined
  Projects: undefined
}

export type MainTabParamList = {
  Tasks: undefined
  Code: undefined
  Settings: undefined
}
