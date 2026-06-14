import { createLogger } from '@rip/shared-utils'
import type { Neo4jClient } from '@rip/graph-engine'
import type { CopilotIntent } from '@rip/types'
import { IntentDetector } from './intent-detector.js'

const log = createLogger('GraphRetriever')

export interface RetrievedNode {
  id: string
  name: string
  type: string
  filePath: string
}

const MAX_ANCHOR_NODES = 5
const MAX_RESULT_NODES = 50
const ROOT_NODE_TYPES = ['repository', 'file', 'module', 'service', 'controller', 'class']

export class GraphRetriever {
  private readonly detector = new IntentDetector()

  constructor(private readonly neo4j: Neo4jClient) {}

  async retrieve(
    repositoryId: string,
    question: string,
    intent: CopilotIntent
  ): Promise<RetrievedNode[]> {
    const keywords = this.detector.extractKeywords(question)
    log.debug('Retrieving', { repositoryId, intent, keywords })

    if (keywords.length === 0) {
      return this.getRootNodes(repositoryId)
    }

    const anchorIds = await this.findAnchors(repositoryId, keywords)
    if (anchorIds.length === 0) {
      log.debug('No anchors found, falling back to root nodes')
      return this.getRootNodes(repositoryId)
    }

    switch (intent) {
      case 'explain-deps':
        return this.traverseReverse(repositoryId, anchorIds)
      case 'explain-arch':
        return this.getRootNodes(repositoryId)
      default:
        return this.traverseForward(repositoryId, anchorIds)
    }
  }

  private async findAnchors(repositoryId: string, keywords: string[]): Promise<string[]> {
    const result = await this.neo4j.runQuery(
      `MATCH (n {repositoryId: $repositoryId})
       WHERE n.label IS NOT NULL AND any(kw IN $keywords WHERE
         toLower(n.label) CONTAINS kw OR
         toLower(coalesce(n.metadataJson, '')) CONTAINS kw
       )
       RETURN n.id AS id
       LIMIT toInteger($limit)`,
      { repositoryId, keywords, limit: MAX_ANCHOR_NODES }
    )
    return this.toStrings(result.records, 'id')
  }

  private async traverseForward(repositoryId: string, anchorIds: string[]): Promise<RetrievedNode[]> {
    const result = await this.neo4j.runQuery(
      `MATCH (anchor {repositoryId: $repositoryId})
       WHERE anchor.id IN $anchorIds
       OPTIONAL MATCH (anchor)-[*..2]-(related {repositoryId: $repositoryId})
       WHERE related.id <> anchor.id
       WITH collect(anchor) + collect(related) AS allNodes
       UNWIND allNodes AS n
       WITH DISTINCT n
       WHERE n.label IS NOT NULL
       RETURN n.id AS id, n.label AS label, n.type AS type, n.metadataJson AS metadataJson
       LIMIT toInteger($limit)`,
      { repositoryId, anchorIds, limit: MAX_RESULT_NODES }
    )
    return this.toNodes(result.records)
  }

  private async traverseReverse(repositoryId: string, anchorIds: string[]): Promise<RetrievedNode[]> {
    const result = await this.neo4j.runQuery(
      `MATCH (anchor {repositoryId: $repositoryId})
       WHERE anchor.id IN $anchorIds
       OPTIONAL MATCH (caller {repositoryId: $repositoryId})-[]->(anchor)
       WITH collect(anchor) + collect(caller) AS allNodes
       UNWIND allNodes AS n
       WITH DISTINCT n
       WHERE n IS NOT NULL AND n.label IS NOT NULL
       RETURN n.id AS id, n.label AS label, n.type AS type, n.metadataJson AS metadataJson
       LIMIT toInteger($limit)`,
      { repositoryId, anchorIds, limit: MAX_RESULT_NODES }
    )
    return this.toNodes(result.records)
  }

  private async getRootNodes(repositoryId: string): Promise<RetrievedNode[]> {
    const result = await this.neo4j.runQuery(
      `MATCH (n {repositoryId: $repositoryId})
       WHERE n.type IN $types AND n.label IS NOT NULL
       RETURN n.id AS id, n.label AS label, n.type AS type, n.metadataJson AS metadataJson
       LIMIT toInteger($limit)`,
      { repositoryId, types: ROOT_NODE_TYPES, limit: MAX_RESULT_NODES }
    )
    return this.toNodes(result.records)
  }

  private getString(r: { get(key: string): unknown }, key: string): string {
    const v = r.get(key)
    if (typeof v !== 'string') throw new Error(`Neo4j field "${key}" expected string, got ${String(v)}`)
    return v
  }

  private parseFilePath(metadataJson: unknown): string {
    if (typeof metadataJson !== 'string') return ''
    try {
      const meta = JSON.parse(metadataJson) as Record<string, unknown>
      return (typeof meta.filePath === 'string' ? meta.filePath
            : typeof meta.path === 'string' ? meta.path
            : '')
    } catch {
      return ''
    }
  }

  private toNodes(records: Array<{ get(key: string): unknown }>): RetrievedNode[] {
    return records.map(r => ({
      id: this.getString(r, 'id'),
      name: this.getString(r, 'label'),
      type: this.getString(r, 'type'),
      filePath: this.parseFilePath(r.get('metadataJson')),
    }))
  }

  private toStrings(records: Array<{ get(key: string): unknown }>, field: string): string[] {
    return records.map(r => this.getString(r, field))
  }
}
