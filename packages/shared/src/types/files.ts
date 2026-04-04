export interface TreeEntry {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: TreeEntry[]
}

export interface DirectoryEntriesResponse {
  base: string
  path: string
  entries: TreeEntry[]
}

export interface FileTreeResponse {
  base: string
  tree: TreeEntry[]
}

export interface FileReadResponse {
  path: string
  content: string
  size: number
}

export interface FileSearchResult {
  path: string
  line_number: number
  text: string
}

export interface FileSearchResponse {
  base: string
  query: string
  path: string
  results: FileSearchResult[]
}
