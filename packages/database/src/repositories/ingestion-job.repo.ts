import { getPrismaClient } from '../prisma.service'
import type { IIngestionJobRepo } from '@rip/types'
import type { IngestionJob } from '@rip/types'

export class IngestionJobRepo implements IIngestionJobRepo {
  private get db() { return getPrismaClient() }

  async create(repositoryId: string): Promise<IngestionJob> {
    const row = await this.db.ingestionJob.create({ data: { repositoryId } })
    return this.toJob(row)
  }

  async complete(id: string, metadata: Record<string, unknown>): Promise<void> {
    await this.db.ingestionJob.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), metadata: metadata as any },
    })
  }

  async fail(id: string, error: string): Promise<void> {
    await this.db.ingestionJob.update({
      where: { id },
      data: { status: 'FAILED', completedAt: new Date(), errorMessage: error },
    })
  }

  async findById(id: string): Promise<IngestionJob | null> {
    const row = await this.db.ingestionJob.findUnique({ where: { id } })
    return row ? this.toJob(row) : null
  }

  async updateProgress(id: string, progress: { step: string; percent: number }): Promise<void> {
    await this.db.ingestionJob.update({
      where: { id },
      data: { metadata: progress as any },
    })
  }

  private toJob(row: any): IngestionJob {
    return {
      id: row.id,
      repositoryId: row.repositoryId,
      status: row.status as any,
      startedAt: row.startedAt,
      completedAt: row.completedAt ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      metadata: row.metadata as any,
    }
  }
}
