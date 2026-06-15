import { getPrismaClient } from '../prisma.service'
import type { IIngestionMetricRepo, IngestionMetricData, CreateIngestionMetricDto } from '@rip/types'

export class IngestionMetricRepo implements IIngestionMetricRepo {
  private get db() {
    return getPrismaClient()
  }

  async create(data: CreateIngestionMetricDto): Promise<IngestionMetricData> {
    const row = await this.db.ingestionMetric.create({ data })
    return this.toData(row)
  }

  async findByRepository(repositoryId: string, limit: number): Promise<IngestionMetricData[]> {
    const rows = await this.db.ingestionMetric.findMany({
      where: { repositoryId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    })
    return rows.map((r) => this.toData(r))
  }

  private toData(row: any): IngestionMetricData {
    return {
      id: row.id,
      repositoryId: row.repositoryId,
      jobId: row.jobId,
      changedFiles: row.changedFiles,
      newFiles: row.newFiles,
      deletedFiles: row.deletedFiles,
      unchangedFiles: row.unchangedFiles,
      parseDurationMs: row.parseDurationMs,
      graphBuildDurationMs: row.graphBuildDurationMs,
      embedDurationMs: row.embedDurationMs,
      totalDurationMs: row.totalDurationMs,
      chunkCount: row.chunkCount,
      nodeCount: row.nodeCount,
      edgeCount: row.edgeCount,
      recordedAt: row.recordedAt,
    }
  }
}
