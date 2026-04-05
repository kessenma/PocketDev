# Server Actions UI

> **Status**: Server-integrated. For the store architecture, see [docs/mobile/stores.md](../mobile/stores.md).

This document covers the mobile server operations workspace under `apps/mobile/src/components/server-actions/`.

## Purpose

The server actions workspace is connected to the paired PocketDev agent. It fetches real diagnostics, server metrics, and operational data via REST API: `fetchServerSummary`, `fetchServerPorts`, `fetchServerNetwork`, `fetchServerErrors`, `fetchServerActions`, and `runServerAction`.

Primary debugging areas represented in the UI:

- open ports and bound processes
- CPU, memory, storage, and load snapshot
- network activity summary
- recent server errors and suggested next steps
- quick command previews for common operational checks

## Entry Points

- `apps/mobile/src/screens/ServerScreen.tsx`
  - wraps the workspace in the standard adaptive mobile shell
- `apps/mobile/src/components/server-actions/ServerWorkspace.tsx`
  - top-level workspace composition and segmented views
- `apps/mobile/src/stores/server-actions.ts`
  - prototype Zustand store and mock operational data
- `apps/mobile/src/navigation/MainTabs.tsx`
  - mounts the workspace as the `Server` tab

## Component Map

### Shared primitives

- `apps/mobile/src/components/server-actions/ServerCard.tsx`
  - shared card shell used across the workspace
- `apps/mobile/src/components/server-actions/ServerSegmentedControl.tsx`
  - segmented control for `overview`, `activity`, and `errors`

### Workspace sections

- `apps/mobile/src/components/server-actions/ServerHealthHero.tsx`
  - header summary with server label, uptime, and open incident count
- `apps/mobile/src/components/server-actions/ServerMetricGrid.tsx`
  - CPU, memory, storage, and load cards
- `apps/mobile/src/components/server-actions/ServerPortList.tsx`
  - port, process, protocol, exposure, and listener status rows
- `apps/mobile/src/components/server-actions/ServerNetworkList.tsx`
  - network throughput and connection summary by interface
- `apps/mobile/src/components/server-actions/ServerErrorList.tsx`
  - recent error cards with severity, source, detail, and suggestion
- `apps/mobile/src/components/server-actions/ServerQuickActions.tsx`
  - touch-friendly previews for common server commands

### Types and exports

- `apps/mobile/src/components/server-actions/model.ts`
  - typed view, metric, port, network, error, and quick action models
- `apps/mobile/src/components/server-actions/index.ts`
  - barrel export for the module

## Current Behavior

- all data is local mock data
- refresh updates the status banner only
- quick actions do not execute commands yet
- the workspace supports phone and tablet split layouts

## Expected Backend Wiring Later

When the server-side app is ready, this client-only prototype store should be replaced or adapted to consume real transport-backed data for:

- current listeners and port ownership
- system resource metrics
- network counters
- recent operational or app errors
- command execution previews and results

Suggested next backend-facing additions:

- define a typed server diagnostics payload shared between mobile and server
- replace quick action previews with transport calls plus streaming command output
- decide whether errors come from logs, health checks, or aggregated diagnostics endpoints

See `docs/server-actions/server-server-actions.md` for the server-side planning document.

## Update Rule

If a server-actions component, store contract, or screen entry point changes, update this document in the same change so the module map stays accurate.
