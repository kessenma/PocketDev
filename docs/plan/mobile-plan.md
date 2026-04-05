# Plan UI

This document tracks the mobile agent plan review workspace under `apps/mobile/src/components/plan/`.

## Purpose

The current implementation supports reviewing AI agent plans on mobile against the paired agent server. The mobile store consumes plan history and active plans from the server, and plan actions flow over the existing task WebSocket transport.

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
  - Zustand store for active plan state, history, and plan actions
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

- refresh fetches the active plan and plan history from the paired server
- answering questions updates local state and sends `plan.answer` over WebSocket
- sending conversation messages appends locally and sends `plan.message`
- accept sends `plan.accept` and moves the resolved plan into history after the server event arrives
- deny sends `plan.deny` and moves the resolved plan into history after the server event arrives
- the workspace supports phone and tablet split layouts
- plan step descriptions and conversation messages render as markdown via `react-native-enriched-markdown`
- the notes editor supports live markdown editing via `EnrichedMarkdownInput`

## Update Rule

If a plan component, store contract, or screen entry point changes, update this document in the same change so the module map stays accurate.
