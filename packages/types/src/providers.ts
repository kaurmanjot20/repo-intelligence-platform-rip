export interface LLMOptions {
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  readonly model: string
  readonly dimensions: number
}

export interface LLMProvider {
  generate(prompt: string, options?: LLMOptions): Promise<string>
  readonly model: string
}
