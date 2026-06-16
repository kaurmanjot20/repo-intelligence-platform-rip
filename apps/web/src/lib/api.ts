import type {
  Repository,
  IngestionJob,
  GraphNode,
  GraphEdge,
  GraphSummary,
  NodeType,
  CopilotAnswer,
  CopilotReference,
} from "@rip/types"

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export interface CreateRepoPayload {
  name: string
  sourceUrl: string
  workspaceId: string
  githubToken?: string
}

export interface CreateRepoResponse {
  repositoryId: string
  jobId: string
  webhookSecret: string
}

export type { CopilotAnswer, CopilotReference }

export interface ImpactedNode {
  nodeId: string
  file: string
  name: string
  relationship: "CALLS" | "IMPORTS"
}

export interface PrAnalysisResult {
  id: string
  changedFiles: string[]
  summary: string
  impactedNodes: ImpactedNode[]
  references: Array<{ nodeId: string; file: string; name: string }>
  durationMs: number
}

export interface IngestionMetricData {
  id: string
  repositoryId: string
  jobId: string
  changedFiles: number
  newFiles: number
  deletedFiles: number
  unchangedFiles: number
  parseDurationMs: number
  graphBuildDurationMs: number
  embedDurationMs: number
  totalDurationMs: number
  chunkCount: number
  nodeCount: number
  edgeCount: number
  recordedAt: string
}

export interface CopilotMessageMetric {
  id: string
  durationMs: number | null
  rating: number | null
  content: string
  createdAt: string
}

export const api = {
  repositories: {
    list: () => req<Repository[]>("/repositories"),
    get: (id: string) => req<Repository>(`/repositories/${id}`),
    create: (data: CreateRepoPayload) =>
      req<CreateRepoResponse>("/repositories", { method: "POST", body: JSON.stringify(data) }),
    remove: (id: string) => req<void>(`/repositories/${id}`, { method: "DELETE" }),
  },
  jobs: {
    get: (jobId: string) => req<IngestionJob>(`/jobs/${jobId}`),
  },
  graph: {
    summary: (repoId: string) => req<GraphSummary>(`/repositories/${repoId}/graph/summary`),
    nodes: (repoId: string, types?: NodeType[]) => {
      const qs = types?.length ? `?types=${types.join(",")}` : ""
      return req<GraphNode[]>(`/repositories/${repoId}/graph/nodes${qs}`)
    },
    edges: (repoId: string) => req<GraphEdge[]>(`/repositories/${repoId}/graph/edges`),
  },
  copilot: {
    ask: (repositoryId: string, question: string, sessionId?: string) =>
      req<CopilotAnswer>(`/repositories/${repositoryId}/copilot/ask`, {
        method: "POST",
        body: JSON.stringify({ question, sessionId }),
      }),
    getMessages: (repositoryId: string, sessionId: string) =>
      req<Array<{ id: string; role: string; content: string; references?: CopilotReference[]; createdAt: string }>>(
        `/repositories/${repositoryId}/copilot/sessions/${sessionId}/messages`
      ),
    rateMessage: (repositoryId: string, messageId: string, rating: 1 | -1) =>
      req<void>(`/repositories/${repositoryId}/copilot/messages/${messageId}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      }),
  },
  prAnalysis: {
    analyze: (repositoryId: string, body: { prUrl?: string; baseSha?: string; headSha?: string }) =>
      req<PrAnalysisResult>(`/repositories/${repositoryId}/pr-analysis`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  benchmarks: {
    ingestion: (repositoryId: string) =>
      req<{ metrics: IngestionMetricData[] }>(`/repositories/${repositoryId}/benchmarks/ingestion`),
    copilot: (repositoryId: string) =>
      req<{ messages: CopilotMessageMetric[] }>(`/repositories/${repositoryId}/benchmarks/copilot`),
  },
}
