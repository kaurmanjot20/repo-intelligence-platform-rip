import { getPrismaClient } from '../prisma.service'
import type {
  IPrAnalysisResultRepo,
  PrAnalysisResultData,
  CreatePrAnalysisDto,
  ImpactedNode,
} from '@rip/types'

export class PrAnalysisResultRepo implements IPrAnalysisResultRepo {
  private get db() {
    return getPrismaClient()
  }

  async create(data: CreatePrAnalysisDto): Promise<PrAnalysisResultData> {
    const row = await this.db.prAnalysisResult.create({
      data: {
        repositoryId: data.repositoryId,
        prUrl: data.prUrl,
        baseSha: data.baseSha,
        headSha: data.headSha,
        changedFiles: data.changedFiles,
        summary: data.summary,
        impactedNodes: data.impactedNodes as any,
        references: data.references as any,
        durationMs: data.durationMs,
      },
    })
    return this.toResult(row)
  }

  async findByRepository(repositoryId: string): Promise<PrAnalysisResultData[]> {
    const rows = await this.db.prAnalysisResult.findMany({
      where: { repositoryId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return rows.map((r) => this.toResult(r))
  }

  async findById(id: string): Promise<PrAnalysisResultData | null> {
    const row = await this.db.prAnalysisResult.findUnique({ where: { id } })
    return row ? this.toResult(row) : null
  }

  private toResult(row: any): PrAnalysisResultData {
    return {
      id: row.id,
      repositoryId: row.repositoryId,
      prUrl: row.prUrl ?? undefined,
      baseSha: row.baseSha ?? undefined,
      headSha: row.headSha ?? undefined,
      changedFiles: row.changedFiles,
      summary: row.summary,
      impactedNodes: row.impactedNodes as ImpactedNode[],
      references: row.references as Array<{ nodeId: string; file: string; name: string }>,
      durationMs: row.durationMs,
      createdAt: row.createdAt,
    }
  }
}
