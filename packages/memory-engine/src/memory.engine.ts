import { createLogger } from '@rip/shared-utils'
import type { IMemoryEngine, ParsedFile, EmbeddingProvider, IChunkRepo } from '@rip/types'
import { Chunker } from './chunker'
import { Embedder } from './embedder'

const log = createLogger('MemoryEngine')

export class MemoryEngine implements IMemoryEngine {
  private readonly chunker = new Chunker()
  private readonly embedder: Embedder

  constructor(
    embeddingProvider: EmbeddingProvider,
    private readonly chunkRepo: IChunkRepo
  ) {
    this.embedder = new Embedder(embeddingProvider, chunkRepo)
  }

  async buildMemory(
    repositoryId: string,
    parsedFiles: ParsedFile[]
  ): Promise<{ chunksIndexed: number; durationMs: number }> {
    const t0 = Date.now()
    log.info('Building memory', { repositoryId, fileCount: parsedFiles.length })

    // 1. Extract chunks from AST
    const chunks = await this.chunker.chunkFiles(parsedFiles)
    log.info('Chunks extracted', { count: chunks.length })

    // 2. Embed all chunks in memory before touching the DB.
    //    If Ollama fails here, the existing chunks are untouched.
    const embedded = await this.embedder.embedAll(chunks)

    // 3. Only after embedding succeeds: delete old chunks and store new ones.
    await this.chunkRepo.deleteByRepository(repositoryId)
    await this.embedder.store(embedded)

    const durationMs = Date.now() - t0
    log.info('Memory built', { repositoryId, chunksIndexed: chunks.length, durationMs })
    return { chunksIndexed: chunks.length, durationMs }
  }

  async getChunkCount(repositoryId: string): Promise<number> {
    return this.chunkRepo.countByRepository(repositoryId)
  }
}
