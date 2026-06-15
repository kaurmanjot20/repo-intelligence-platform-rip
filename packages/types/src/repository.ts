export type IngestionStatus =
  | 'pending'
  | 'cloning'
  | 're_ingesting'
  | 'parsing'
  | 'building_graph'
  | 'indexing'
  | 'ready'
  | 'error'

export type WebhookEventStatus = 'PENDING' | 'ACCEPTED' | 'PROCESSED' | 'SKIPPED' | 'FAILED'

export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'java'
export type SourceType = 'github_url' | 'zip_upload'

export interface RepositoryCapabilities {
  frameworks: string[]
  hasFrontend: boolean
  hasBackend: boolean
}

export interface Repository {
  id: string
  workspaceId: string
  name: string
  description?: string
  sourceType: SourceType
  sourceUrl?: string
  localPath: string
  status: IngestionStatus
  errorMessage?: string
  languages: SupportedLanguage[]
  capabilities: RepositoryCapabilities
  fileCount: number
  nodeCount: number
  edgeCount: number
  currentCommitHash?: string
  defaultBranch?: string
  parseDurationMs?: number
  graphBuildDurationMs?: number
  graphVersion: number
  graphBuiltAt?: Date
  chunkCount?: number
  indexedAt?: Date
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
  webhookConfigured: boolean
  trackedBranch?: string
  syncStatus?: {
    state: WebhookEventStatus
    updatedAt: string
  }
}

export interface IngestionJob {
  id: string
  repositoryId: string
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  startedAt: Date
  completedAt?: Date
  errorMessage?: string
  metadata?: Record<string, unknown>
}
