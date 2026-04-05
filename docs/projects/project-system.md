# Project System

## Overview

The project system manages repository discovery, cloning, branch creation, and active project selection. Projects are stored in the agent's SQLite database and exposed to mobile and console via REST API.

## Architecture

```
Mobile (ProjectsScreen)          Agent Server              Filesystem
    │                                │                        │
    │  GET /projects                 │                        │
    │────────────────────────────►   │  listProjects()        │
    │   ProjectSummary[]             │  ├── DB projects       │
    │◄────────────────────────────   │  └── GitHub repos      │
    │                                │                        │
    │  POST /projects/clone          │                        │
    │  { projectId }                 │                        │
    │────────────────────────────►   │  cloneProject()        │
    │                                │──────────────────►     │
    │                                │  git clone <url>       │
    │   ProjectSummary               │                        │
    │◄────────────────────────────   │                        │
    │                                │                        │
    │  POST /projects/select         │                        │
    │  { projectId }                 │                        │
    │────────────────────────────►   │  selectProject()       │
    │   ProjectSummary               │  Set active project    │
    │◄────────────────────────────   │  Update working dir    │
    │                                │                        │
```

## Agent Service

**Source**: `apps/agent/src/services/projects.ts`

### Directory Constants

```
INITIAL_PROJECT_DIR = POCKETDEV_PROJECT_DIR || HOME
CLONE_ROOT = POCKETDEV_REPOS_DIR || ~/PocketDev/repos/
```

### Key Functions

**listProjects()**: Combines local DB records with GitHub repos (if `gh` CLI authenticated).

**selectProject(id)**: Sets the active project, updates working directory for tasks and file operations.

**cloneProject(id, branchMode?, newBranchName?)**: Clones a GitHub repo into `CLONE_ROOT`, optionally creates a new branch.

**createBranch(id, branchName)**: Creates and checks out a new branch on an existing project.

### GitHub Integration

When `gh` CLI is authenticated:
- Fetches user's repos via `gh repo list`
- Merges with locally known projects
- Provides clone capability for uncloned repos

### Debug Logging

Ring buffer of 40 entries tracking operations (fetch, clone, select, branch).

## Agent Routes

**Source**: `apps/agent/src/routes/projects.ts`

| Method | Path | Purpose |
|---|---|---|
| GET | `/projects` | List all projects (local + GitHub) |
| POST | `/projects/select` | Set active project |
| POST | `/projects/clone` | Clone a GitHub repo |
| POST | `/projects/branch` | Create new branch |

## Mobile Store

**Source**: `apps/mobile/src/stores/projects.ts`

```typescript
State: {
  projects: ProjectSummary[]
  githubUsername: string | null
  cloneCelebrationProjectId: string | null  // Triggers animation
  isMutating: boolean
  mutatingAction: 'clone' | 'select' | 'branch' | null
}
```

### Project Selection Side Effects

When `selectProject()` is called:
- Files store resets (`resetForProjectSwitch`)
- Git store reloads
- Preview store resets
- Active project used as working directory for new tasks

## Database Schema

### projects table

| Column | Type | Notes |
|---|---|---|
| id | text PK | UUID or GitHub repo ID |
| name | text | Repository name |
| owner | text | GitHub owner/org |
| local_path | text | Relative path from CLONE_ROOT |
| remote_url | text | Git remote URL |
| default_branch | text | Main branch name |
| visibility | text | 'public' / 'private' / null |
| source | text | 'github' / 'local' |
| is_active | boolean | Currently selected project |
| created_at | text | ISO timestamp |
| updated_at | text | ISO timestamp |

## ProjectSummary Type

```typescript
type ProjectSummary = {
  id: string
  name: string
  owner: string | null
  absolutePath: string | null
  remoteUrl: string | null
  defaultBranch: string | null
  visibility: 'public' | 'private' | null
  source: 'github' | 'local'
  isActive: boolean
  isCloned: boolean
  lastActivity: string | null
}
```
