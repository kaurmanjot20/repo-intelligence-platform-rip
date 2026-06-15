import { createLogger } from "@rip/shared-utils"
import type { IGraphRepository, GraphNode, GraphEdge, GraphSummary, GraphPath, NodeFilters, NodeWithRelationships, NodeType } from "@rip/types"
import { Neo4jClient } from "./neo4j.client"

const log = createLogger("GraphRepository")

const SMART_LOAD_THRESHOLD = 2000

export class GraphRepository implements IGraphRepository {
  constructor(private readonly neo4j: Neo4jClient) {}

  async getGraphSummary(repositoryId: string): Promise<GraphSummary> {
    const result = await this.neo4j.runQuery(
      `MATCH (n:Node {repositoryId: $repositoryId})
       RETURN n.type AS type, count(n) AS count`,
      { repositoryId },
    )

    const byType: Partial<Record<NodeType, number>> = {}
    let totalNodes = 0
    for (const record of result.records) {
      const type = record.get("type") as NodeType
      const count = (record.get("count") as { toNumber(): number }).toNumber()
      byType[type] = count
      totalNodes += count
    }

    const edgeResult = await this.neo4j.runQuery(
      `MATCH (a:Node {repositoryId: $repositoryId})-[r]->(b:Node {repositoryId: $repositoryId})
       RETURN count(r) AS total`,
      { repositoryId },
    )
    const totalEdges = (edgeResult.records[0]?.get("total") as { toNumber(): number })?.toNumber() ?? 0

    log.debug("Graph summary", { repositoryId, totalNodes, totalEdges })
    return { repositoryId, byType, totalNodes, totalEdges }
  }

  async getNodes(repositoryId: string, filters?: NodeFilters): Promise<GraphNode[]> {
    const summary = await this.getGraphSummary(repositoryId)

    // Smart loading: if too large, return only top-level nodes (file and above)
    const typeFilter = filters?.types ?? (summary.totalNodes >= SMART_LOAD_THRESHOLD
      ? (["repository", "service", "module", "file", "controller", "api"] as NodeType[])
      : undefined)

    const typeClause = typeFilter ? "AND n.type IN $types" : ""
    const result = await this.neo4j.runQuery(
      `MATCH (n:Node {repositoryId: $repositoryId})
       WHERE 1=1 ${typeClause}
       RETURN n
       SKIP $offset LIMIT $limit`,
      {
        repositoryId,
        types: typeFilter ?? [],
        offset: neo4jInt(filters?.offset ?? 0),
        limit: neo4jInt(filters?.limit ?? 5000),
      },
    )

    return result.records.map((r) => recordToNode(r.get("n")))
  }

  async getEdges(repositoryId: string): Promise<GraphEdge[]> {
    const result = await this.neo4j.runQuery(
      `MATCH (a:Node {repositoryId: $repositoryId})-[r]->(b:Node {repositoryId: $repositoryId})
       RETURN r, a.id AS sourceId, b.id AS targetId`,
      { repositoryId },
    )
    return result.records.map((r) => recordToEdge(r.get("r"), r.get("sourceId") as string, r.get("targetId") as string))
  }

  async getNodeWithRelationships(nodeId: string): Promise<NodeWithRelationships> {
    const result = await this.neo4j.runQuery(
      `MATCH (n:Node {id: $nodeId})
       OPTIONAL MATCH (n)-[out]->(target:Node)
       OPTIONAL MATCH (source:Node)-[inc]->(n)
       RETURN n, collect(DISTINCT {rel: out, target: target}) AS outgoing,
              collect(DISTINCT {rel: inc, source: source}) AS incoming`,
      { nodeId },
    )
    const record = result.records[0]
    if (!record) throw new Error(`Node not found: ${nodeId}`)

    const node = recordToNode(record.get("n"))
    type Neo4jRaw = { properties: Record<string, unknown> }
    type Neo4jRel = { type: string; properties: Record<string, unknown> }
    const outgoing = (record.get("outgoing") as Array<{ rel: Neo4jRel; target: Neo4jRaw }>)
      .filter((o) => o.rel && o.target)
      .map((o) => ({
        edge: recordToEdge(o.rel, nodeId, o.target.properties["id"] as string),
        target: recordToNode(o.target),
      }))
    const incoming = (record.get("incoming") as Array<{ rel: Neo4jRel; source: Neo4jRaw }>)
      .filter((i) => i.rel && i.source)
      .map((i) => ({
        edge: recordToEdge(i.rel, i.source.properties["id"] as string, nodeId),
        source: recordToNode(i.source),
      }))

    return { node, outgoing, incoming }
  }

  async findPath(sourceId: string, targetId: string): Promise<GraphPath> {
    const result = await this.neo4j.runQuery(
      `MATCH p = shortestPath((a:Node {id: $sourceId})-[*..10]->(b:Node {id: $targetId}))
       RETURN p`,
      { sourceId, targetId },
    )
    const record = result.records[0]
    if (!record) return { nodes: [], edges: [], length: 0 }

    type SegRaw = { start: { properties: Record<string, unknown> }; relationship: { type: string; properties: Record<string, unknown> }; end: { properties: Record<string, unknown> } }
    const p = record.get("p") as { segments: SegRaw[] }
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []

    for (const seg of p.segments) {
      if (nodes.length === 0) nodes.push(recordToNode(seg.start))
      nodes.push(recordToNode(seg.end))
      edges.push(recordToEdge(
        seg.relationship,
        seg.start.properties["id"] as string,
        seg.end.properties["id"] as string,
      ))
    }

    return { nodes, edges, length: edges.length }
  }

  async getNodesForFiles(repositoryId: string, filePaths: string[]): Promise<GraphNode[]> {
    if (filePaths.length === 0) return []
    const result = await this.neo4j.runQuery(
      `MATCH (n:Node {repositoryId: $repositoryId})
       WHERE n.filePath IN $filePaths
       RETURN n`,
      { repositoryId, filePaths },
    )
    return result.records.map((r) => recordToNode(r.get("n")))
  }

  async getCallersOf(
    repositoryId: string,
    filePaths: string[],
  ): Promise<Array<{ node: GraphNode; relationship: string }>> {
    if (filePaths.length === 0) return []
    const result = await this.neo4j.runQuery(
      `MATCH (caller:Node)-[r:CALLS|IMPORTS]->(n:Node {repositoryId: $repositoryId})
       WHERE n.filePath IN $filePaths
         AND caller.repositoryId = $repositoryId
       RETURN DISTINCT caller, type(r) AS rel`,
      { repositoryId, filePaths },
    )
    return result.records.map((r) => ({
      node: recordToNode(r.get("caller")),
      relationship: r.get("rel") as string,
    }))
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function neo4jInt(n: number) {
  return neo4j.int(n)
}

import neo4j from "neo4j-driver"
import type { NodeType as NT } from "@rip/types"

function recordToNode(raw: { properties: Record<string, unknown> }): GraphNode {
  const p = raw.properties
  return {
    id: p["id"] as string,
    type: p["type"] as NT,
    label: p["label"] as string,
    repositoryId: p["repositoryId"] as string,
    metadata: p["metadataJson"] ? JSON.parse(p["metadataJson"] as string) : {},
  }
}

function recordToEdge(raw: { type: string; properties: Record<string, unknown> }, sourceId: string, targetId: string): GraphEdge {
  return {
    id: (raw.properties["id"] as string | undefined) ?? `${raw.type}:${sourceId}->${targetId}`,
    sourceId,
    targetId,
    type: raw.type as import("@rip/types").EdgeType,
    properties: raw.properties,
  }
}
