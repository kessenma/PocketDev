# Mobile Model Selector

This document tracks the mobile model selection flow used by `NewTaskScreen`.

## Purpose

The current implementation is mostly local-first, with server-backed capability discovery for provider availability and GitHub Copilot model enumeration.

Primary areas represented in the UI:

- provider-first selection for Claude, Codex, and GitHub Copilot
- curated static model lists for Claude and Codex
- server-discovered Copilot model list from the paired agent capability payload
- prompt drafting alongside the selected provider/model
- local draft persistence on-device
- task startup routing that passes the selected CLI model id to the agent

## Entry Points

- `apps/mobile/src/screens/NewTaskScreen.tsx`
  - mounts the selector inside the existing task creation screen
- `apps/mobile/src/components/model-selector/ModelSelector.tsx`
  - reusable provider/model picker UI
- `apps/mobile/src/components/model-selector/catalog.ts`
  - local provider catalog plus merge helpers for server-supplied Copilot models
- `apps/mobile/src/stores/new-task-draft.ts`
  - local Zustand draft state and persistence bridge
- `apps/mobile/src/services/storage.ts`
  - MMKV persistence for the draft payload
- `apps/mobile/src/components/model-selector/index.ts`
  - barrel export for the module

## Component Map

### Shared selector primitives

- `apps/mobile/src/components/model-selector/model.ts`
  - typed provider and selectable model models
- `apps/mobile/src/components/model-selector/catalog.ts`
  - curated starter catalog and selection helpers

### UI

- `apps/mobile/src/components/model-selector/ModelSelector.tsx`
  - provider chips, provider summary, and model list cards

### State and integration

- `apps/mobile/src/stores/new-task-draft.ts`
  - selected provider, selected model, prompt draft, and last prototype message
- `apps/mobile/src/screens/NewTaskScreen.tsx`
  - summary row, prompt composer, recent prompts, and save-draft action

## Current Behavior

- Claude and Codex provider/model data is local curated catalog data
- Copilot model data is merged from the server capability payload when available
- prompt, provider, and model selection are persisted locally on the device
- the primary action starts a websocket task with the selected provider/model
- server capability checks are performed for provider availability and Copilot models

## Expected Backend Wiring Later

When the server-side app is ready, this local-only catalog and draft flow should be replaced or adapted to consume real transport-backed capability data.

Expected server-backed additions:

- fetch available AI providers and model options from the paired server
- indicate which CLIs are installed, authenticated, and runnable
- map the selected provider/model to a real task-start payload
- surface unsupported or unavailable selections from the server

Suggested next backend-facing additions:

- define a typed provider/model catalog payload shared between mobile and server
- decide whether model availability comes from prerequisites, task-manager capabilities, or a separate agent catalog route
- re-enable task creation only after the server can validate the selected provider/model pair

## Update Rule

If the selector catalog, draft store, or `NewTaskScreen` integration changes, update this document in the same change so the module map stays accurate.
