import { createLogger } from '@rip/shared-utils'
import type { EmbeddingProvider, IChunkRepo, Chunk } from '@rip/types'

const log = createLogger('Embedder')

const BATCH_SIZE = 10

export type ChunkWithEmbedding = Chunk & { embedding: number[] }

export class Embedder {
  constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly chunkRepo: IChunkRepo
  ) {}

  async embedAll(chunks: Chunk[]): Promise<ChunkWithEmbedding[]> {
    if (chunks.length === 0) return []
    log.info('Embedding chunks', { count: chunks.length })

    const result: ChunkWithEmbedding[] = []
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const texts = batch.map(c => `${c.name}\n${c.content}`)
      const embeddings = await this.embeddingProvider.embedBatch(texts)

      if (embeddings.length !== batch.length) {
        throw new Error(
          `Embedding count mismatch: expected ${batch.length}, got ${embeddings.length}`
        )
      }

      result.push(...batch.map((chunk, idx) => ({ ...chunk, embedding: embeddings[idx] })))
      log.debug('Embedded batch', { from: i, to: i + batch.length - 1 })
    }

    log.info('Embedding complete', { count: chunks.length })
    return result
  }

  async store(chunks: ChunkWithEmbedding[]): Promise<void> {
    await this.chunkRepo.bulkUpsert(chunks)
  }
}
