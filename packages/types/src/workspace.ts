export interface Workspace {
  id: string
  name: string
  createdAt: Date
}

export interface User {
  id: string
  workspaceId: string
  email: string
  name: string
}
