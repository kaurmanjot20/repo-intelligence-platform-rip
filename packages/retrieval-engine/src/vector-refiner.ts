import { createLogger } from '@rip/shared-utils'
import type { EmbeddingProvider, IChunkRepo, Chunk } from '@rip/types'

const log = createLogger('VectorRefiner')

export class VectorRefiner {
  constructor(
    private readonly chunkRepo: IChunkRepo,
    private readonly embeddingProvider: EmbeddingProvider
  ) {}

  async refine(
    repositoryId: string,
    question: string,
    nodeIds: string[],
    limit = 10
  ): Promise<Array<Chunk & { similarity: number }>> {
    if (nodeIds.length === 0) return []

    log.debug('Refining', { repositoryId, nodeIdCount: nodeIds.length })

    const queryEmbedding = await this.embeddingProvider.embed(question)
    return this.chunkRepo.similaritySearch(repositoryId, queryEmbedding, nodeIds, limit)
  }
}
