export type ProjectSource = 'seeded' | 'local' | 'github_clone' | 'github_profile'
export type ProjectVisibility = 'public' | 'private' | 'unknown'

export interface ProjectSummary {
  id: string
  name: string
  owner: string | null
  remoteUrl: string | null
  localPath: string | null
  isLocal: boolean
  isActive: boolean
  needsClone: boolean
  defaultBranch: string | null
  lastUpdatedAt: string | null
  visibility: ProjectVisibility
  source: ProjectSource
}

export interface ListProjectsResponse {
  projects: ProjectSummary[]
  githubUsername: string | null
}

export interface SelectProjectRequest {
  projectId: string
  pullLatest?: boolean
}

export interface CloneProjectRequest {
  projectId: string
  branchMode?: 'default' | 'new'
  newBranchName?: string
}

export interface CreateProjectBranchRequest {
  branchName: string
}

export interface ProjectMutationResult {
  ok: true
  project: ProjectSummary
}
