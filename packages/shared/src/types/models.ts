import type { TaskStatus, TaskMode, ChangeType, DevicePlatform, AgentType } from '../schema/enums.js'

export interface Device {
  id: string
  name: string
  platform: DevicePlatform
  public_key: string
  created_at: string
  last_seen_at: string
}

export interface Task {
  id: string
  prompt: string
  agent_type: AgentType
  mode: TaskMode
  model: string | null
  status: TaskStatus
  working_directory: string | null
  project_id: string | null
  project_name: string | null
  session_id: string | null
  turn_count: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface TaskTurn {
  id: string
  task_id: string
  turn_number: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface FileChange {
  path: string
  change_type: ChangeType
  diff: string | null
  timestamp: string
}

export interface InstallRecord {
  id: string
  hostname: string
  ip_address: string
  os: string
  agent_version: string
  created_at: string
}
