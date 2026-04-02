# Files UI

This document tracks the mobile-only prototype for the read-only file explorer under `apps/mobile/src/components/files/`.

## Purpose

The current implementation is a UI-first prototype for browsing project files on mobile. It is intentionally backed by local mock state so the browsing and code-reading flow can be shaped before wiring it to the PocketDev server transport.

Right now this workspace is client-side only. The mobile app is not yet fetching real trees, loading file contents on demand, or streaming updates from the paired server.

Primary areas represented in the UI:

- project tree browsing
- directory expand and collapse state
- read-only TypeScript and JavaScript source preview
- line number rendering for code
- line wrap toggle for mobile readability

## Entry Points

- `apps/mobile/src/screens/FilesScreen.tsx`
  - wraps the workspace in the standard adaptive mobile shell
- `apps/mobile/src/components/files/FileWorkspace.tsx`
  - top-level workspace composition and phone/tablet behavior
- `apps/mobile/src/stores/files.ts`
  - prototype Zustand store and mock file tree data
- `apps/mobile/src/navigation/MainTabs.tsx`
  - mounts the workspace as the `Files` tab

## Component Map

### Shared primitives

- `apps/mobile/src/components/files/FileCard.tsx`
  - re-exported card shell shared across the file explorer workspace
- `apps/mobile/src/components/files/FileBreadcrumbs.tsx`
  - lightweight path display for the selected file
- `apps/mobile/src/components/files/FileViewerToolbar.tsx`
  - back action for phone flow and line wrap toggle

### Workspace sections

- `apps/mobile/src/components/files/FileTreeList.tsx`
  - touch-friendly nested file and folder list
- `apps/mobile/src/components/files/CodeViewer.tsx`
  - read-only source preview with line numbers and wrap behavior
- `apps/mobile/src/components/files/FileWorkspace.tsx`
  - assembles the browser and viewer into phone and tablet layouts

### Types and exports

- `apps/mobile/src/components/files/model.ts`
  - typed file node, code language, and viewer mode models
- `apps/mobile/src/components/files/index.ts`
  - barrel export for the module

## Current Behavior

- all data is local mock data
- selecting a file opens the preview inside the prototype workspace state
- the viewer renders `.ts`, `.tsx`, `.js`, and `.jsx` mock files only
- unsupported file types open into a placeholder state
- the workspace supports phone and tablet split layouts

## Expected Backend Wiring Later

When the server-side app is ready, this client-only prototype store should be replaced or adapted to consume real file-tree and file-content payloads for:

- project directory listing
- on-demand file content loading
- file metadata such as size or modified time
- transport-backed refresh and error handling

Suggested next backend-facing additions:

- define a shared file explorer payload between mobile and server
- fetch tree structure lazily for large projects instead of shipping the full tree at once
- stream file content or page it for large files once performance limits are clear

## Update Rule

If a files component, store contract, or screen entry point changes, update this document in the same change so the module map stays accurate.
