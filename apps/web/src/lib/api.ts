import type {
  Repository,
  IngestionJob,
  GraphNode,
  GraphEdge,
  GraphSummary,
  NodeType,
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
}

export interface CreateRepoResponse {
  repositoryId: string
  jobId: string
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
}
