export type NodeType =
  | 'repository'
  | 'service'
  | 'module'
  | 'file'
  | 'class'
  | 'function'
  | 'api'
  | 'database'
  | 'controller'
  | 'interface'
  | 'external_dependency'

export type EdgeType =
  | 'IMPORTS'
  | 'CALLS'
  | 'EXTENDS'
  | 'IMPLEMENTS'
  | 'USES'
  | 'DEPENDS_ON'
  | 'EXPOSES_API'
  | 'CONTAINS'

export interface GraphNode {
  id: string
  type: NodeType
  label: string
  repositoryId: string
  metadata: Record<string, unknown>
}

export interface GraphEdge {
  id: string
  sourceId: string
  targetId: string
  type: EdgeType
  properties?: Record<string, unknown>
}

export interface GraphPath {
  nodes: GraphNode[]
  edges: GraphEdge[]
  length: number
}

export interface NodeWithRelationships {
  node: GraphNode
  outgoing: { edge: GraphEdge; target: GraphNode }[]
  incoming: { edge: GraphEdge; source: GraphNode }[]
}

export interface NodeFilters {
  types?: NodeType[]
  limit?: number
  offset?: number
}

export interface GraphBuildResult {
  repositoryId: string
  nodesCreated: number
  edgesCreated: number
  durationMs: number
  warnings: string[]
}

export interface GraphSummary {
  repositoryId: string
  byType: Partial<Record<NodeType, number>>
  totalNodes: number
  totalEdges: number
  buildDurationMs?: number
  warnings?: string[]
}

// Reserved for Phase 2
export interface ContextChunk {
  id: string
  content: string
  sourceNodeIds: string[]
}
