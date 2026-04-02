# Server Actions Server Integration Plan

This is a planning document only. It does not describe implementation work already completed.

The goal is to connect the mobile server-actions workspace to the PocketDev agent in a way that reuses the existing authentication, REST routes, WebSocket transport, and terminal session support already present in `apps/agent`.

## Scope

This plan covers how to back the mobile server-actions UI with real server data for:

- system resource metrics
- open ports and owning processes
- network activity summaries
- recent operational errors
- quick command previews and command execution

This plan does not cover:

- full infrastructure monitoring
- alerting integrations
- long-term metrics storage
- implementation details for charts or historical dashboards

## Current State

Today the mobile UI is client-side only:

- `apps/mobile/src/components/server-actions/*` renders from mock state
- `apps/mobile/src/stores/server-actions.ts` is a local prototype store
- no live diagnostics are fetched from the agent
- no commands are executed from the server-actions workspace

Relevant server-side building blocks that already exist:

- authenticated pairing and server identity
- authenticated WebSocket at `/ws`
- authenticated terminal WebSocket at `/ws/terminal`
- REST routes such as `/health`, `/setup/prerequisites`, `/containers/*`, `/databases/*`
- server-side services for Docker, terminal sessions, and general process/task management

## Integration Strategy

The safest path is to split the server-actions backend into two layers:

1. structured diagnostics endpoints for data the UI needs frequently
2. terminal or task-backed execution for ad hoc command flows

That keeps the common screens fast and typed, while still allowing deeper debugging when the user wants a real command run.

## Proposed Transport Model

### 1. Snapshot diagnostics over REST

Use authenticated REST for the main screen payloads:

- `GET /server-actions/summary`
- `GET /server-actions/ports`
- `GET /server-actions/network`
- `GET /server-actions/errors`

Reasoning:

- the mobile views are mostly snapshot-based
- refresh is already a pull interaction in the current UI
- typed REST responses are easier to cache and debug than raw command output

### 2. Optional live updates over WebSocket

If live monitoring becomes important, add a namespaced stream on the existing `/ws` connection rather than inventing a new socket:

- `server_actions.subscribe`
- `server_actions.unsubscribe`
- `server_actions.snapshot`
- `server_actions.updated`

This should be phase 2, not phase 1.

### 3. Command execution via existing terminal/task patterns

Quick actions should not directly execute arbitrary shell commands from the mobile app without a server-side wrapper.

Preferred order:

1. add named server-side actions such as `ports.check` or `system.snapshot`
2. have the agent map those to vetted shell commands internally
3. return structured output when possible
4. fall back to terminal streaming only for advanced debugging

This avoids turning the mobile UI into a raw shell launcher too early.

## Proposed Server Contracts

## Summary endpoint

`GET /server-actions/summary`

Purpose:

- fill the hero card and metric grid

Suggested payload shape:

```ts
type ServerActionsSummary = {
  serverLabel: string
  uptime: string
  metrics: Array<{
    id: 'cpu' | 'memory' | 'storage' | 'load'
    label: string
    value: string
    detail: string
    tone: 'healthy' | 'warning' | 'critical' | 'neutral'
  }>
  incidentCount: number
  generatedAt: string
}
```

Suggested data sources:

- `uptime`
- `free` or `/proc/meminfo`
- `df -h` or `statvfs`
- load averages from the host OS

## Ports endpoint

`GET /server-actions/ports`

Purpose:

- populate the ports and processes list

Suggested payload shape:

```ts
type ServerPortEntry = {
  id: string
  port: number
  protocol: 'tcp' | 'udp'
  service: string
  process: string
  exposure: 'public' | 'private' | 'local'
  status: 'listening' | 'busy' | 'closed'
}
```

Suggested data sources:

- `ss -tulpn`
- optional container port mapping from the Docker service

## Network endpoint

`GET /server-actions/network`

Purpose:

- populate interface traffic and connection counts

Suggested payload shape:

```ts
type ServerNetworkEntry = {
  id: string
  interface: string
  inbound: string
  outbound: string
  connections: number
  detail: string
}
```

Suggested data sources:

- `/proc/net/dev`
- `ss`
- Docker bridge metadata when relevant

## Errors endpoint

`GET /server-actions/errors`

Purpose:

- populate the recent error list

This endpoint needs product decisions before implementation because “server errors” can mean several different things:

- PocketDev agent errors
- system service failures
- Docker container failures
- reverse proxy failures
- curated log patterns from selected services

Recommended first cut:

- PocketDev agent process errors
- Docker container restart/failure signals
- optionally nginx or reverse proxy failures if that exists in your target setup

Suggested payload shape:

```ts
type ServerErrorEntry = {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  source: string
  relativeTime: string
  detail: string
  suggestion: string
}
```

## Quick actions endpoint

Avoid letting the client invent command strings.

Instead, expose a static server-defined catalog:

`GET /server-actions/actions`

and an execution route:

`POST /server-actions/actions/:actionId/run`

Suggested first actions:

- `ports`
- `stats`
- `storage`
- `network`

Suggested execution response model:

- immediate snapshot result for short commands
- optional task or terminal session reference for longer-running commands

## Execution Model Choices

There are three realistic ways to power the quick actions:

### Option A: REST wrappers around specific commands

Best for:

- ports
- system snapshot
- disk usage summary

Pros:

- typed
- constrained
- safer

Cons:

- more server code per action

### Option B: run through the existing task system

Best for:

- AI-assisted inspect flows
- heavier diagnostics that can be streamed and archived

Pros:

- reuses current task output infrastructure
- can persist logs naturally

Cons:

- overkill for tiny snapshots

### Option C: run through `/ws/terminal`

Best for:

- future “advanced debug” mode

Pros:

- already exists
- flexible

Cons:

- least structured
- harder to render safely in a focused mobile card UI

Recommended approach:

- use Option A for the first version
- keep Option B for deeper inspect workflows
- reserve Option C for explicit terminal use, not default card actions

## Suggested Agent Structure

If implemented later, the server side could be organized as:

- `apps/agent/src/routes/server-actions.ts`
- `apps/agent/src/services/server-actions.ts`

The service layer should:

- collect host metrics
- normalize shell or OS output into typed payloads
- avoid leaking raw, inconsistent command output into the mobile API

## Security and Safety Constraints

The server-actions workspace is operational by nature, so the API should be conservative.

Requirements:

- require the same device authentication already used elsewhere
- prefer allowlisted actions over arbitrary command input
- bound execution time for snapshot commands
- redact secrets, tokens, and private connection strings from outputs
- avoid returning giant raw logs by default

## Rollout Plan

### Phase 1

- add summary, ports, network, and errors snapshot endpoints
- update the mobile store to fetch typed REST payloads on refresh
- keep quick actions as preview-only in the UI

### Phase 2

- add action catalog plus vetted action execution endpoints
- return small structured payloads for common checks
- add failure states and empty states to the mobile store

### Phase 3

- add optional WebSocket subscription for live updates
- add drill-down flows into terminal or task-backed inspection

## Open Questions

- what exact sources should define “recent server errors”
- should container failures appear in this workspace or remain a separate Docker/container surface
- how much of the output should be pre-digested versus raw
- whether the first version needs polling only or true live updates
- whether quick actions should create auditable task records

## Recommendation

Start with typed snapshot endpoints and a narrow allowlist of server-defined actions. That gives the mobile server-actions workspace real utility without committing too early to raw shell execution as the primary product model.
