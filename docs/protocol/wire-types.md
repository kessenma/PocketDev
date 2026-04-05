# Wire Protocol Types

## Overview

All WebSocket communication between mobile and agent uses a single message envelope defined in `packages/shared/src/types/messages.ts`. Types are shared across mobile, agent, and console.

## Message Envelope

```typescript
interface WsMessage<T = unknown> {
  type: CommandType | EventType   // Message discriminator
  id: string                      // Unique per message (UUID)
  payload: T                      // Type-specific payload
  timestamp: number               // Client/server timestamp (ms)
}
```

## Commands (Mobile → Server)

```typescript
type CommandType =
  | 'task.start'                  // Start a new AI task
  | 'task.kill'                   // Kill a running task
  | 'task.input'                  // Send input to task stdin
  | 'task.list'                   // Request task list
  | 'container.logs.follow'       // Start following container logs
  | 'container.logs.stop'         // Stop following container logs
  | 'files.approve'               // Approve file change
  | 'files.reject'                // Reject file change
  | 'terminal.input'              // Send terminal input
  | 'terminal.resize'             // Resize terminal
  | 'setup.check_prerequisites'   // Request prerequisites check
  | 'plan.answer'                 // Answer a plan question
  | 'plan.message'                // Send chat message to plan agent
  | 'plan.accept'                 // Accept proposed plan
  | 'plan.deny'                   // Deny proposed plan
  | 'ping'                        // Keepalive
```

## Events (Server → Mobile)

```typescript
type EventType =
  | 'task.output'                 // Task stdout/stderr line
  | 'task.status_changed'         // Task status transition
  | 'task.completed'              // Task finished
  | 'container.logs.chunk'        // Container log lines
  | 'container.logs.stopped'      // Container log follow ended
  | 'files.changed'               // File system change detected
  | 'device.connected'            // Device connected
  | 'device.disconnected'         // Device disconnected
  | 'terminal.output'             // Terminal PTY output
  | 'terminal.exited'             // Terminal session ended
  | 'setup.prerequisites_result'  // Prerequisites check result
  | 'plan.proposed'               // New plan proposed by agent
  | 'plan.agent_message'          // Agent message in plan chat
  | 'plan.step_updated'           // Plan step status changed
  | 'plan.resolved'               // Plan completed/denied
  | 'pong'                        // Keepalive response
```

## Key Payload Types

### Task Commands

```typescript
// task.start
{ prompt: string, agent_type: 'claude' | 'codex', working_directory?: string, model?: string }

// task.kill
{ task_id: string }

// task.input
{ task_id: string, data: string }
```

### Task Events

```typescript
// task.output
{ task_id: string, stream: 'stdout' | 'stderr', data: string }

// task.status_changed
{ task_id: string, status: 'pending' | 'running' | 'completed' | 'failed' | 'killed' }

// task.completed
{ task_id: string, exit_code: number }
```

### Terminal Messages

```typescript
// terminal.input (command)
{ sessionId: string, data: string }

// terminal.resize (command)
{ sessionId: string, cols: number, rows: number }

// terminal.ready (event)
{ sessionId: string }

// terminal.output (event)
{ data: string }

// terminal.exited (event)
{ exitCode: number }
```

### Container Logs

```typescript
// container.logs.follow (command)
{ container_id: string, lines?: number, direction?: 'oldest' | 'newest' }

// container.logs.chunk (event)
{ container_id: string, lines: ContainerLogLine[] }

// container.logs.stopped (event)
{ container_id: string }
```

### Plan Messages

```typescript
// plan.answer (command)
{ question_id: string, answer: string }

// plan.message (command)
{ text: string }

// plan.proposed (event)
{ plan: PlanEntry }

// plan.step_updated (event)
{ plan_id: string, step_id: string, status: string }

// plan.resolved (event)
{ plan_id: string, resolution: 'approved' | 'denied' | 'completed' }
```

## Type Definitions Location

All shared types are in `packages/shared/src/types/`:

| File | Types |
|---|---|
| `messages.ts` | WsMessage, CommandType, EventType |
| `models.ts` | Task, Device, FileChange, InstallRecord |
| `docker.ts` | ContainerSummary, ContainerLogLine |
| `files.ts` | FileNode, FileSearchResult |
| `git.ts` | GitFileChange, GitCommitEntry, GitBranchOption, GitRemoteState |
| `plan.ts` | PlanEntry, PlanStep, PlanQuestion, PlanMessage |
| `projects.ts` | ProjectSummary |
| `server-actions.ts` | ServerMetric, ServerPortEntry, ServerNetworkEntry |
| `setup.ts` | ToolCheck, PrerequisitesReport |
| `capabilities.ts` | ModelProvider, ProviderAvailability |
