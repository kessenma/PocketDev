export type RootStackParamList = {
  Connect: { url?: string } | undefined
  ServerSetup: undefined
  Main: undefined
  TaskDetail: { taskId: string }
  Containers: undefined
  Plan: undefined
}

export type MainTabParamList = {
  Tasks: undefined
  Files: undefined
  Server: undefined
  NewTask: undefined
  Settings: undefined
}
