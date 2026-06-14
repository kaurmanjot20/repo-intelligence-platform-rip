import { createLogger } from '@rip/shared-utils'
import type { EmbeddingProvider } from '@rip/types'

const log = createLogger('OllamaEmbeddingProvider')

interface OllamaEmbedResponse {
  embeddings: number[][]
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'nomic-embed-text'
  readonly dimensions = 768

  constructor(
    private readonly baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  ) {}

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text])
    return results[0]
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const resp = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: texts }),
    })
    if (!resp.ok) {
      throw new Error(`Ollama embed failed [${resp.status}]: ${resp.statusText}`)
    }
    const data = await resp.json() as OllamaEmbedResponse
    if (!Array.isArray(data.embeddings) || data.embeddings.length !== texts.length) {
      throw new Error(`Ollama embed response shape unexpected (got ${data.embeddings?.length ?? 0}, expected ${texts.length})`)
    }
    log.debug('Embedded batch', { count: texts.length })
    return data.embeddings
  }
}
