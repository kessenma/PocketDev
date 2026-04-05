# Mobile Zustand Stores

## Overview

PocketDev mobile uses Zustand 5 for state management. Stores are independent modules that access each other via `useXStore.getState()` (no circular dependencies). All stores live in `src/stores/`.

## Store Dependency Graph

```
connection (root)
├── Manages: WebSocket instance, server info
├── Routes WS messages to: tasks, containers, setup, plan
└── On connect: triggers newTaskDraft.loadCapabilities()

tasks
├── Reads: connection.ws (to send commands)
├── Reads: connection.server (for REST refresh)
└── Fed by: connection WS handler (task.output, task.status_changed)

files
├── Reads: connection.server (for REST calls)
└── Independent (no WS events)

git
├── Reads: connection.server (for REST calls)
└── Independent (no WS events)

containers
├── Reads: connection.server (for REST calls)
└── Fed by: connection WS handler (container.logs.chunk, container.logs.stopped)

plan
├── Reads: connection.ws (to send commands)
├── Reads: connection.server (for REST refresh)
└── Fed by: connection WS handler (plan.proposed, plan.agent_message, plan.step_updated, plan.resolved)

projects
├── Reads: connection.server (for REST calls)
└── Independent

setup
├── Reads: connection.server (for REST calls)
└── Fed by: connection WS handler (setup.prerequisites_result)
    └── On update: triggers newTaskDraft.loadCapabilities()

newTaskDraft
├── Reads: connection.server (for capabilities fetch)
└── Independent

preview
├── Reads: connection.server (for session creation)
└── Independent

serverActions
├── Reads: connection.server (for REST calls)
└── Independent
```

## Store Details

### connection

**Source**: `src/stores/connection.ts`

The root store. Manages the WebSocket connection and routes incoming messages.

```typescript
State: {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  server: { ip, port, deviceId } | null
  ws: PocketDevWebSocket | null
}

Actions:
  loadFromStorage()    // Restore server from MMKV, auto-connect
  connect()            // Build WS URL, instantiate PocketDevWebSocket
  disconnect()         // Close WS, reset status
  setPaired(server)    // Save server, auto-connect
  unpair()             // Disconnect, call unpair API, clear storage
```

**Message routing** in `handleWsMessage`:
- `task.output` → `taskStore.appendLog`
- `task.status_changed` → `taskStore.updateTaskStatus`
- `container.logs.chunk` → `containerStore.appendLogChunk`
- `container.logs.stopped` → `containerStore.handleLogsStopped`
- `setup.prerequisites_result` → `setupStore.setState` + `newTaskDraftStore.loadCapabilities`
- `plan.*` → `planStore.handle*`

### tasks

**Source**: `src/stores/tasks.ts`

```typescript
State: {
  tasks: Map<string, Task>
  activeTaskId: string | null
  taskLogs: Map<string, string[]>
}

Actions:
  setTasks(tasks[])           // Replace all tasks
  refreshFromServer()         // Fetch via REST, rebuild Map
  startTask(prompt, agent, cwd?, model?)  // WS send 'task.start'
  killTask(id)                // WS send 'task.kill'
  appendLog(taskId, line)     // Append to log array
  updateTaskStatus(taskId, status)  // Update task in Map
  setActiveTask(id)           // Set active selection
```

### files

**Source**: `src/stores/files.ts`

```typescript
State: {
  rootLabel, rootPath, currentPath: string
  currentEntries: FileNode[]
  directoryEntriesByPath: Record<string, FileNode[]>  // Cache
  selectedFile: FileNode | null
  selectedFileContent: string | null
  activePhoneView: 'browser' | 'viewer'
  wrapLines: boolean
  searchQuery, searchResults: FileSearchResult[]
  selectedContextPaths: string[]  // Pinned for AI context
}

Actions:
  openDirectory(path)    // Fetch from server, cache in memory + MMKV
  navigateUp()           // Pop directory level
  selectFile(path)       // Fetch content, switch to viewer on phone
  goBackToBrowser()      // Switch back to file tree on phone
  toggleContextPath(path)  // Pin/unpin for AI context
  runSearch(query)       // ripgrep search via REST
  refresh()              // Re-fetch current directory
  resetForProjectSwitch()  // Clear all state
```

**Caching**: In-memory `directoryEntriesByPath` + MMKV `getCachedDirectorySnapshot`. Falls back to server fetch.

### git

**Source**: `src/stores/git.ts`

```typescript
State: {
  repoName, repoPath: string
  activeView: 'changes' | 'commits' | 'branches' | 'status'
  changes: GitFileChange[]
  commits: GitCommitEntry[]
  branches: GitBranchOption[]
  remote: GitRemoteState  // { ahead, behind, status: 'synced'|'needs_pull'|'needs_push' }
  commitMessage: string
  isCommitting, isPushing: boolean
}

Actions:
  selectView(view)         // Switch tab
  selectFile(fileId)       // Select for diff preview
  selectBranch(name)       // Checkout via API
  updateCommitMessage(msg) // Set message
  refresh()                // Fetch summary, changes, commits, branches
  commit()                 // POST commit
  push()                   // POST push
```

### containers

**Source**: `src/stores/containers.ts`

```typescript
State: {
  containers: ContainerSummary[]
  selectedContainerId: string | null
  activeView: 'list' | 'logs'
  logsByContainer: Record<string, ContainerLogLine[]>
  isFollowingLogs: boolean
  direction: 'oldest' | 'newest'
  filter: ContainerLogsFilter
}

Actions:
  refreshContainers()           // Fetch container list
  loadLogs()                    // Fetch logs with line count
  startFollowingLogs()          // WS send 'container.logs.follow'
  stopFollowingLogs()           // WS send 'container.logs.stop'
  appendLogChunk(payload)       // WS event handler (buffer max 2000 lines)
  handleLogsStopped(payload)    // WS event handler
```

### plan

**Source**: `src/stores/plan.ts`

```typescript
State: {
  activePlan: PlanEntry | null  // { id, title, description, status, steps[], questions[], messages[], notes }
  history: PlanEntry[]
  activeView: 'overview' | 'steps' | 'chat' | 'notes'
  isRefreshing, isSubmitting: boolean
}

Actions:
  answerQuestion(qId, answer)   // WS send 'plan.answer'
  sendMessage(text)             // WS send 'plan.message'
  acceptPlan()                  // WS send 'plan.accept'
  denyPlan()                    // WS send 'plan.deny'
  refresh()                     // REST fetch active + history

WS Handlers:
  handlePlanProposed(event)     // New plan received
  handleAgentMessage(event)     // Agent chat message
  handleStepUpdated(event)      // Step status changed
  handlePlanResolved(event)     // Plan completed/denied
```

### projects

**Source**: `src/stores/projects.ts`

```typescript
State: {
  projects: ProjectSummary[]
  githubUsername: string | null
  cloneCelebrationProjectId: string | null
  isMutating: boolean
  mutatingAction: 'clone' | 'select' | 'branch' | null
}

Actions:
  refresh()                         // Fetch project list
  selectProject(id)                 // POST select, triggers file/git store reset
  cloneProject(id, branch?, name?)  // POST clone
  createBranch(id, name)            // POST create branch
```

### setup

**Source**: `src/stores/setup.ts`

```typescript
State: {
  report: PrerequisitesReport | null
  loading: boolean
  error: string | null
}

Actions:
  fetchPrerequisites()  // REST fetch, on success triggers newTaskDraft.loadCapabilities()
```

### newTaskDraft

**Source**: `src/stores/new-task-draft.ts`

```typescript
State: {
  prompt: string
  selectedProviderId: string  // 'claude' | 'codex'
  selectedModelId: string
  providers: ModelProvider[] | null
  isLoadingCapabilities: boolean
}

Actions:
  setPrompt(text)                  // Set + persist to MMKV
  selectProvider(id)               // Switch provider, auto-select model
  selectModel(providerId, modelId) // Set model + persist
  loadCapabilities()               // Fetch from server, merge availability
  submitDraft()                    // Set confirmation message
```

### preview

**Source**: `src/stores/preview.ts`

```typescript
State: {
  visible: boolean
  sessionId: string | null
  targetUrl: string           // Default: 'http://localhost:3000'
  proxiedUrl: string | null
  status: 'idle' | 'connecting' | 'loaded' | 'failed'
}

Actions:
  openPreview(targetUrl?)  // Create browser session on server
  markLoaded()             // WebView loaded
  markFailed(error)        // WebView error
  closePreview()           // Hide
  resetForProjectChange()  // Clear all
```

### serverActions

**Source**: `src/stores/server-actions.ts`

```typescript
State: {
  serverLabel, uptime: string
  activeView: 'overview' | 'ports' | 'network' | 'errors' | 'actions'
  metrics: ServerMetric[]
  ports: ServerPortEntry[]
  network: ServerNetworkEntry[]
  errors: ServerErrorEntry[]
  actions: ServerQuickAction[]
}

Actions:
  refresh()              // Fetch all diagnostics data
  previewAction(actionId)  // Execute quick action
```
