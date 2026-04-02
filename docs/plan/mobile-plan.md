# Plan UI

This document tracks the mobile-only prototype for the agent plan review workspace under `apps/mobile/src/components/plan/`.

## Purpose

The current implementation is a UI-first prototype for reviewing AI agent plans on mobile. It is intentionally backed by local mock state so the interaction model can be shaped before wiring it to the server-side app.

Right now this workspace is client-side only. The mobile app is not yet receiving real plans from, or sending plan decisions to, the paired server.

Primary plan review areas represented in the UI:

- plan summary with agent name, status, and step/question counts
- numbered step list with kind badges and optional file paths
- inline question/answer flow for agent questions
- free-form user notes with markdown editing
- accept and deny action buttons
- conversation thread between user and agent
- history of resolved plans

## Entry Points

- `apps/mobile/src/screens/PlanScreen.tsx`
  - wraps the workspace in the standard adaptive mobile shell
- `apps/mobile/src/components/plan/PlanWorkspace.tsx`
  - top-level workspace composition and segmented views
- `apps/mobile/src/stores/plan.ts`
  - prototype Zustand store and mock plan data
- `apps/mobile/src/components/plan/index.ts`
  - barrel export for the module

## Component Map

### Shared primitives

- `apps/mobile/src/components/plan/PlanCard.tsx`
  - shared card shell used across the plan workspace
- `apps/mobile/src/components/plan/PlanBadge.tsx`
  - compact status badge for plan states
- `apps/mobile/src/components/plan/PlanSegmentedControl.tsx`
  - segmented control for `plan`, `conversation`, and `history`

### Workspace sections

- `apps/mobile/src/components/plan/PlanSummaryCard.tsx`
  - plan title, description, agent name, status badge, step count, pending question count
- `apps/mobile/src/components/plan/PlanStepList.tsx`
  - numbered plan steps with kind badges, descriptions rendered as markdown, and optional file paths
- `apps/mobile/src/components/plan/PlanQuestionList.tsx`
  - agent questions with inline TextInput answers and required/answered indicators
- `apps/mobile/src/components/plan/PlanNotes.tsx`
  - free-form markdown editor for user annotations using `react-native-enriched-markdown`
- `apps/mobile/src/components/plan/PlanActionBar.tsx`
  - accept and deny buttons with loading state and disabled logic
- `apps/mobile/src/components/plan/PlanConversation.tsx`
  - chat-style message thread with markdown rendering and send input
- `apps/mobile/src/components/plan/PlanHistoryList.tsx`
  - resolved plans with status badges, agent names, and user notes preview

### Types and exports

- `apps/mobile/src/components/plan/model.ts`
  - typed plan view, status, step kind, step, question, message, and entry models
- `apps/mobile/src/components/plan/index.ts`
  - barrel export for the module

## Current Behavior

- all data is local mock data
- refresh only updates the status banner from the prototype store
- answering questions updates local state only
- sending conversation messages triggers a mock agent auto-reply
- accept moves the active plan to history with status `accepted`
- deny moves the active plan to history with status `denied`
- the workspace supports phone and tablet split layouts
- plan step descriptions and conversation messages render as markdown via `react-native-enriched-markdown`
- the notes editor supports live markdown editing via `EnrichedMarkdownInput`

## Expected Backend Wiring Later

When the server-side app is ready, this client-only store should be replaced or adapted to consume real plan data and actions from the paired server.

Expected server-backed capabilities:

- receive plan proposals from the agent over the existing WebSocket connection
- submit question answers back to the agent
- send accept or deny decisions
- stream conversation messages in real time
- fetch plan history from the agent

Suggested next backend-facing additions:

- define a shared plan payload between mobile and server in `@pocketdev/shared/types`
- map plan actions to WebSocket commands (plan.accept, plan.deny, plan.answer, plan.message)
- decide whether plan history is stored on the agent or only in the mobile store

## Update Rule

If a plan component, store contract, or screen entry point changes, update this document in the same change so the module map stays accurate.
