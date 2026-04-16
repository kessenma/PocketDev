import { z } from 'zod'

export const taskStatusEnum = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'killed',
])
export type TaskStatus = z.infer<typeof taskStatusEnum>

export const taskModeEnum = z.enum(['default', 'plan'])
export type TaskMode = z.infer<typeof taskModeEnum>

export const changeTypeEnum = z.enum(['created', 'modified', 'deleted'])
export type ChangeType = z.infer<typeof changeTypeEnum>

export const devicePlatformEnum = z.enum(['ios', 'android'])
export type DevicePlatform = z.infer<typeof devicePlatformEnum>

export const agentTypeEnum = z.enum(['claude', 'codex', 'copilot', 'shell', 'minimax'])
export type AgentType = z.infer<typeof agentTypeEnum>
