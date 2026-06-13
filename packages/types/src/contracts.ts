import type { SupportedLanguage, IngestionStatus } from './repository'
import type { ParsedFile } from './parser'
import type {
  GraphNode,
  GraphEdge,
  GraphBuildResult,
  GraphSummary,
  GraphPath,
  NodeFilters,
  NodeWithRelationships,
} from './graph'
import type { Repository, IngestionJob } from './repository'

// ─── Ingestion ────────────────────────────────────────────────────────────────

export interface IngestionResult {
  repositoryId: string
  localPath: string
  languages: SupportedLanguage[]
  fileCount: number
  commitHash?: string
  defaultBranch?: string
}

export interface IIngestionService {
  ingestFromUrl(url: string, workspaceId: string): Promise<IngestionResult>
  ingestFromZip(zipPath: string, workspaceId: string): Promise<IngestionResult>
  detectLanguages(repositoryPath: string): Promise<SupportedLanguage[]>
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export interface IParser {
  parseRepository(repositoryPath: string, languages: SupportedLanguage[]): Promise<ParsedFile[]>
  parseFile(filePath: string, language: SupportedLanguage): Promise<ParsedFile>
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface IGraphEngine {
  buildGraph(repositoryId: string, files: ParsedFile[]): Promise<GraphBuildResult>
}

export interface IGraphRepository {
  getNodes(repositoryId: string, filters?: NodeFilters): Promise<GraphNode[]>
  getEdges(repositoryId: string): Promise<GraphEdge[]>
  getNodeWithRelationships(nodeId: string): Promise<NodeWithRelationships>
  getGraphSummary(repositoryId: string): Promise<GraphSummary>
  findPath(sourceId: string, targetId: string): Promise<GraphPath>
}

// ─── Database Repositories ────────────────────────────────────────────────────

export interface CreateRepositoryDto {
  workspaceId: string
  name: string
  sourceType: 'GITHUB_URL' | 'ZIP_UPLOAD'
  sourceUrl?: string
  localPath: string
}

export interface RepoStats {
  fileCount?: number
  nodeCount?: number
  edgeCount?: number
  parseDurationMs?: number
  graphBuildDurationMs?: number
  graphBuiltAt?: Date
  graphVersion?: number
  currentCommitHash?: string
  defaultBranch?: string
  languages?: string[]
}

export interface IRepositoryRepo {
  create(data: CreateRepositoryDto): Promise<Repository>
  findById(id: string): Promise<Repository | null>
  findByWorkspace(workspaceId: string): Promise<Repository[]>
  updateStatus(id: string, status: IngestionStatus, error?: string): Promise<void>
  updateStats(id: string, stats: RepoStats): Promise<void>
  softDelete(id: string): Promise<void>
}

export interface IParsedFileRepo {
  bulkCreate(files: ParsedFile[]): Promise<void>
  findByRepository(repositoryId: string): Promise<ParsedFile[]>
  findByPath(repositoryId: string, path: string): Promise<ParsedFile | null>
}

export interface IIngestionJobRepo {
  create(repositoryId: string): Promise<IngestionJob>
  complete(id: string, metadata: Record<string, unknown>): Promise<void>
  fail(id: string, error: string): Promise<void>
  findById(id: string): Promise<IngestionJob | null>
}
