export interface IngestionJobPayload {
  repositoryId: string
  jobId: string
  triggeredBy: 'api' | 'webhook' | 'manual'
}
