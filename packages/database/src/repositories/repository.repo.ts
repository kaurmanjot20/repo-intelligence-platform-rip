import { getPrismaClient } from '../prisma.service'
import type {
  IRepositoryRepo,
  CreateRepositoryDto,
  RepoStats,
} from '@rip/types'
import type { Repository, IngestionStatus } from '@rip/types'
import { createLogger } from '@rip/shared-utils'

const log = createLogger('RepositoryRepo')

export class RepositoryRepo implements IRepositoryRepo {
  private get db() { return getPrismaClient() }

  async create(data: CreateRepositoryDto): Promise<Repository> {
    const row = await this.db.repository.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl,
        localPath: data.localPath,
      },
    })
    return this.toRepository(row)
  }

  async findById(id: string): Promise<Repository | null> {
    const row = await this.db.repository.findUnique({ where: { id } })
    return row ? this.toRepository(row) : null
  }

  async findByWorkspace(workspaceId: string): Promise<Repository[]> {
    const rows = await this.db.repository.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => this.toRepository(r))
  }

  async updateStatus(id: string, status: IngestionStatus, error?: string): Promise<void> {
    await this.db.repository.update({
      where: { id },
      data: { status: status.toUpperCase() as any, errorMessage: error ?? null },
    })
    log.info('Status updated', { id, status })
  }

  async updateStats(id: string, stats: RepoStats): Promise<void> {
    await this.db.repository.update({
      where: { id },
      data: {
        ...(stats.fileCount !== undefined && { fileCount: stats.fileCount }),
        ...(stats.nodeCount !== undefined && { nodeCount: stats.nodeCount }),
        ...(stats.edgeCount !== undefined && { edgeCount: stats.edgeCount }),
        ...(stats.parseDurationMs !== undefined && { parseDurationMs: stats.parseDurationMs }),
        ...(stats.graphBuildDurationMs !== undefined && { graphBuildDurationMs: stats.graphBuildDurationMs }),
        ...(stats.graphBuiltAt !== undefined && { graphBuiltAt: stats.graphBuiltAt }),
        ...(stats.graphVersion !== undefined && { graphVersion: stats.graphVersion }),
        ...(stats.currentCommitHash !== undefined && { currentCommitHash: stats.currentCommitHash }),
        ...(stats.defaultBranch !== undefined && { defaultBranch: stats.defaultBranch }),
        ...(stats.languages !== undefined && { languages: stats.languages }),
        ...(stats.chunkCount !== undefined && { chunkCount: stats.chunkCount }),
        ...(stats.indexedAt !== undefined && { indexedAt: stats.indexedAt }),
      },
    })
  }

  async softDelete(id: string): Promise<void> {
    await this.db.repository.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  private toRepository(row: any): Repository {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      description: row.description ?? undefined,
      sourceType: row.sourceType === 'GITHUB_URL' ? 'github_url' : 'zip_upload',
      sourceUrl: row.sourceUrl ?? undefined,
      localPath: row.localPath,
      status: row.status.toLowerCase() as IngestionStatus,
      errorMessage: row.errorMessage ?? undefined,
      languages: row.languages as any[],
      capabilities: { frameworks: [], hasFrontend: false, hasBackend: false },
      fileCount: row.fileCount,
      nodeCount: row.nodeCount,
      edgeCount: row.edgeCount,
      currentCommitHash: row.currentCommitHash ?? undefined,
      defaultBranch: row.defaultBranch ?? undefined,
      parseDurationMs: row.parseDurationMs ?? undefined,
      graphBuildDurationMs: row.graphBuildDurationMs ?? undefined,
      graphVersion: row.graphVersion,
      graphBuiltAt: row.graphBuiltAt ?? undefined,
      chunkCount: row.chunkCount ?? undefined,
      indexedAt: row.indexedAt ?? undefined,
      deletedAt: row.deletedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
