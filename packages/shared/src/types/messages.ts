export type CommandType =
  | 'task.start'
  | 'task.kill'
  | 'task.input'
  | 'task.list'
  | 'container.logs.follow'
  | 'container.logs.stop'
  | 'files.approve'
  | 'files.reject'
  | 'terminal.input'
  | 'terminal.resize'
  | 'setup.check_prerequisites'
  | 'plan.answer'
  | 'plan.message'
  | 'plan.accept'
  | 'plan.deny'
  | 'ping'

export type EventType =
  | 'task.output'
  | 'task.status_changed'
  | 'task.completed'
  | 'container.logs.chunk'
  | 'container.logs.stopped'
  | 'files.changed'
  | 'device.connected'
  | 'device.disconnected'
  | 'terminal.output'
  | 'terminal.exited'
  | 'setup.prerequisites_result'
  | 'plan.proposed'
  | 'plan.agent_message'
  | 'plan.step_updated'
  | 'plan.resolved'
  | 'pong'

export interface WsMessage<T = unknown> {
  type: CommandType | EventType
  id: string
  payload: T
  timestamp: number
}
