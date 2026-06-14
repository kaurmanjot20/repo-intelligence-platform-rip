import { getPrismaClient } from '../prisma.service'
import type { IChunkRepo, Chunk } from '@rip/types'
import { createLogger } from '@rip/shared-utils'

const log = createLogger('ChunkRepo')

export class ChunkRepo implements IChunkRepo {
  private get db() { return getPrismaClient() }

  async bulkUpsert(chunks: Array<Chunk & { embedding: number[] }>): Promise<void> {
    if (chunks.length === 0) return
    // Callers must call deleteByRepository before this to ensure metadata is always fresh.

    await this.db.chunk.createMany({
      data: chunks.map(c => ({
        id: c.id,
        repositoryId: c.repositoryId,
        nodeId: c.nodeId,
        filePath: c.filePath,
        nodeType: c.nodeType,
        name: c.name,
        content: c.content,
        startLine: c.startLine,
        endLine: c.endLine,
      })),
      skipDuplicates: true,
    })

    for (const chunk of chunks) {
      const embeddingStr = `[${chunk.embedding.join(',')}]`
      await this.db.$executeRawUnsafe(
        `UPDATE "Chunk" SET embedding = $1::vector WHERE id = $2`,
        embeddingStr,
        chunk.id
      )
    }

    log.debug('Upserted chunks', { count: chunks.length })
  }

  async similaritySearch(
    repositoryId: string,
    queryEmbedding: number[],
    nodeIds: string[],
    limit = 10
  ): Promise<Array<Chunk & { similarity: number }>> {
    if (nodeIds.length === 0) return []

    const embeddingStr = `[${queryEmbedding.join(',')}]`
    const results = await this.db.$queryRawUnsafe<Array<{
      id: string
      repositoryId: string
      nodeId: string
      filePath: string
      nodeType: string
      name: string
      content: string
      startLine: number
      endLine: number
      similarity: number
    }>>(
      `SELECT id, "repositoryId", "nodeId", "filePath", "nodeType", name, content,
              "startLine", "endLine",
              1 - (embedding <=> $4::vector) AS similarity
       FROM "Chunk"
       WHERE "repositoryId" = $1
         AND "nodeId" = ANY($2)
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $4::vector
       LIMIT $3`,
      repositoryId,  // $1
      nodeIds,       // $2
      limit,         // $3
      embeddingStr   // $4
    )

    return results.map(r => ({
      ...r,
      nodeType: r.nodeType as Chunk['nodeType'],
    }))
  }

  async deleteByRepository(repositoryId: string): Promise<void> {
    const { count } = await this.db.chunk.deleteMany({ where: { repositoryId } })
    log.debug('Deleted chunks', { repositoryId, count })
  }

  async countByRepository(repositoryId: string): Promise<number> {
    return this.db.chunk.count({ where: { repositoryId } })
  }

  async deleteByFilePaths(repositoryId: string, filePaths: string[]): Promise<number> {
    if (filePaths.length === 0) return 0
    const { count } = await this.db.chunk.deleteMany({
      where: { repositoryId, filePath: { in: filePaths } },
    })
    log.debug('Deleted chunks by file paths', { repositoryId, count })
    return count
  }
}
