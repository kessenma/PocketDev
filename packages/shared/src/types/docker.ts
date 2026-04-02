export type ContainerStatus =
  | 'running'
  | 'created'
  | 'restarting'
  | 'paused'
  | 'exited'
  | 'dead'
  | 'removing'
  | 'unknown'

export type ContainerLogsDirection = 'head' | 'tail'

export type ContainerLogsFilter = 'all' | 'errors'

export type ContainerLogStream = 'stdout' | 'stderr' | 'combined'

export interface ContainerSummary {
  id: string
  name: string
  image: string
  command: string
  state: ContainerStatus
  status_text: string
  created_at: string
  running_for: string
  ports: string[]
  is_running: boolean
}

export interface ContainerLogLine {
  content: string
  stream: ContainerLogStream
  is_error: boolean
}

export interface ContainerLogsRequest {
  container_id: string
  line_count: number
  direction: ContainerLogsDirection
  filter: ContainerLogsFilter
}

export interface ContainerLogsSnapshot {
  container_id: string
  line_count: number
  direction: ContainerLogsDirection
  filter: ContainerLogsFilter
  returned_line_count: number
  lines: ContainerLogLine[]
}

export interface ContainerLogsFollowRequest {
  container_id: string
  line_count: number
  direction: ContainerLogsDirection
  filter: ContainerLogsFilter
}

export interface ContainerLogsChunkEvent {
  container_id: string
  line: string
  stream: ContainerLogStream
  is_error: boolean
}

export interface ContainerLogsStoppedEvent {
  container_id: string
  reason: 'completed' | 'stopped' | 'stopped_by_client' | 'terminated'
}