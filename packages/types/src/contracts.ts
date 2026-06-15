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

export interface DiffResult {
  changedFiles: string[]
  newFiles: string[]
  deletedFiles: string[]
  unchangedFiles: string[]
}

export interface IncrementalIngestionResult {
  isReIngest: boolean
  changedFiles: number
  newFiles: number
  deletedFiles: number
  unchangedFiles: number
}

export interface IIngestionService {
  ingestFromUrl(url: string, repositoryId: string): Promise<IngestionResult>
  ingestFromZip(zipPath: string, repositoryId: string): Promise<IngestionResult>
  detectLanguages(repositoryPath: string): Promise<SupportedLanguage[]>
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export interface IParser {
  parseRepository(repositoryPath: string, languages: SupportedLanguage[], repositoryId: string): Promise<ParsedFile[]>
  parseFile(filePath: string, language: SupportedLanguage): Promise<ParsedFile>
  parseFiles(repositoryPath: string, relativePaths: string[], languages: SupportedLanguage[], repositoryId: string): Promise<ParsedFile[]>
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface IGraphEngine {
  buildGraph(repositoryId: string, files: ParsedFile[]): Promise<GraphBuildResult>
  deleteNodesForFiles(repositoryId: string, filePaths: string[]): Promise<void>
}

export interface IGraphRepository {
  getNodes(repositoryId: string, filters?: NodeFilters): Promise<GraphNode[]>
  getEdges(repositoryId: string): Promise<GraphEdge[]>
  getNodeWithRelationships(nodeId: string): Promise<NodeWithRelationships>
  getGraphSummary(repositoryId: string): Promise<GraphSummary>
  findPath(sourceId: string, targetId: string): Promise<GraphPath>
  getNodesForFiles(repositoryId: string, filePaths: string[]): Promise<GraphNode[]>
  getCallersOf(repositoryId: string, filePaths: string[]): Promise<Array<{ node: GraphNode; relationship: string }>>
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
  chunkCount?: number
  indexedAt?: Date
  localPath?: string
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
  findForDiff(repositoryId: string): Promise<{ path: string; contentHash: string }[]>
  bulkUpsert(files: ParsedFile[]): Promise<void>
  bulkDelete(repositoryId: string, paths: string[]): Promise<void>
}

export interface IIngestionJobRepo {
  create(repositoryId: string): Promise<IngestionJob>
  complete(id: string, metadata: Record<string, unknown>): Promise<void>
  fail(id: string, error: string): Promise<void>
  findById(id: string): Promise<IngestionJob | null>
  updateProgress(id: string, progress: { step: string; percent: number }): Promise<void>
}

// ─── PR Analysis ──────────────────────────────────────────────────────────────

export interface ImpactedNode {
  nodeId: string
  file: string
  name: string
  relationship: 'CALLS' | 'IMPORTS'
}

export interface PrAnalysisResultData {
  id: string
  repositoryId: string
  prUrl?: string
  baseSha?: string
  headSha?: string
  changedFiles: string[]
  summary: string
  impactedNodes: ImpactedNode[]
  references: Array<{ nodeId: string; file: string; name: string }>
  durationMs: number
  createdAt: Date
}

export interface CreatePrAnalysisDto {
  repositoryId: string
  prUrl?: string
  baseSha?: string
  headSha?: string
  changedFiles: string[]
  summary: string
  impactedNodes: ImpactedNode[]
  references: Array<{ nodeId: string; file: string; name: string }>
  durationMs: number
}

export interface IPrAnalysisResultRepo {
  create(data: CreatePrAnalysisDto): Promise<PrAnalysisResultData>
  findByRepository(repositoryId: string): Promise<PrAnalysisResultData[]>
  findById(id: string): Promise<PrAnalysisResultData | null>
}
