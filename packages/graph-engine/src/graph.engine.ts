import { createLogger } from "@rip/shared-utils"
import type { IGraphEngine, GraphBuildResult, ParsedFile } from "@rip/types"
import { mapParsedFileToGraph } from "./node.mapper"
import { Neo4jClient } from "./neo4j.client"
import type { GraphNode, GraphEdge } from "@rip/types"

const log = createLogger("GraphEngine")

const BATCH_SIZE = 200

export class GraphEngine implements IGraphEngine {
  constructor(private readonly neo4j: Neo4jClient) {}

  async buildGraph(repositoryId: string, files: ParsedFile[]): Promise<GraphBuildResult> {
    const t0 = Date.now()
    const warnings: string[] = []
    let nodesCreated = 0
    let edgesCreated = 0

    log.info("Building graph", { repositoryId, fileCount: files.length })

    // Collect all nodes and edges
    const allNodes: GraphNode[] = []
    const allEdges: GraphEdge[] = []

    // Add repository root node
    allNodes.push({
      id: repositoryId,
      type: "repository",
      label: repositoryId,
      repositoryId,
      metadata: { fileCount: files.length },
    })

    for (const file of files) {
      try {
        const { nodes, edges } = mapParsedFileToGraph(file)
        allNodes.push(...nodes)
        allEdges.push(...edges)

        // CONTAINS edge from repo → file
        allEdges.push({
          id: `CONTAINS:${repositoryId}->${file.id}`,
          sourceId: repositoryId,
          targetId: file.id,
          type: "CONTAINS",
        })
      } catch (err) {
        warnings.push(`Failed to map ${file.path}: ${(err as Error).message}`)
      }
    }

    // Deduplicate nodes by id (external_dependency nodes may appear multiple times)
    const nodeMap = new Map<string, GraphNode>()
    for (const n of allNodes) nodeMap.set(n.id, n)
    const uniqueNodes = Array.from(nodeMap.values())

    // Drop edges whose source OR target doesn't exist in node map (unresolved inheritance)
    const nodeIds = new Set(uniqueNodes.map((n) => n.id))
    const resolvedEdges = allEdges.filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId))
    const unresolvedCount = allEdges.length - resolvedEdges.length
    if (unresolvedCount > 0) warnings.push(`${unresolvedCount} edges dropped (unresolved targets)`)

    // Batch-write nodes
    for (let i = 0; i < uniqueNodes.length; i += BATCH_SIZE) {
      const batch = uniqueNodes.slice(i, i + BATCH_SIZE)
      await this.mergeNodes(batch)
      nodesCreated += batch.length
    }

    // Batch-write edges
    for (let i = 0; i < resolvedEdges.length; i += BATCH_SIZE) {
      const batch = resolvedEdges.slice(i, i + BATCH_SIZE)
      await this.mergeEdges(batch)
      edgesCreated += batch.length
    }

    const durationMs = Date.now() - t0
    log.info("Graph built", { repositoryId, nodesCreated, edgesCreated, durationMs })

    return { repositoryId, nodesCreated, edgesCreated, durationMs, warnings }
  }

  private async mergeNodes(nodes: GraphNode[]): Promise<void> {
    await this.neo4j.runQuery(
      `UNWIND $nodes AS n
       MERGE (node:Node {id: n.id})
       SET node += {
         type: n.type,
         label: n.label,
         repositoryId: n.repositoryId,
         metadataJson: n.metadataJson
       }
       WITH node, n
       CALL apoc.create.addLabels(node, [n.type]) YIELD node AS labeled
       RETURN labeled`,
      {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          label: n.label,
          repositoryId: n.repositoryId,
          metadataJson: JSON.stringify(n.metadata),
        })),
      },
    )
  }

  private async mergeEdges(edges: GraphEdge[]): Promise<void> {
    // APOC allows dynamic relationship types
    await this.neo4j.runQuery(
      `UNWIND $edges AS e
       MATCH (src:Node {id: e.sourceId})
       MATCH (tgt:Node {id: e.targetId})
       CALL apoc.merge.relationship(src, e.type, {id: e.id}, e.properties, tgt) YIELD rel
       RETURN rel`,
      {
        edges: edges.map((e) => ({
          id: e.id,
          sourceId: e.sourceId,
          targetId: e.targetId,
          type: e.type,
          properties: e.properties ?? {},
        })),
      },
    )
  }
}
