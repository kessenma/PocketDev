export interface TreeEntry {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: TreeEntry[]
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
