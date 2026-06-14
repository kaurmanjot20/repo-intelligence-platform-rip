import { createLogger } from '@rip/shared-utils'
import type { LLMProvider, LLMOptions } from '@rip/types'

const log = createLogger('OllamaLLMProvider')

interface OllamaGenerateResponse {
  response: string
}

export class OllamaLLMProvider implements LLMProvider {
  readonly model: string

  constructor(
    model = process.env.OLLAMA_LLM_MODEL ?? 'qwen2.5-coder',
    private readonly baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  ) {
    this.model = model
  }

  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    const fullPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt

    const body: Record<string, unknown> = {
      model: this.model,
      prompt: fullPrompt,
      stream: false,
    }
    if (options?.temperature !== undefined) body.temperature = options.temperature
    if (options?.maxTokens !== undefined) body.num_predict = options.maxTokens

    log.debug('Generating', { model: this.model, promptLength: fullPrompt.length })

    const resp = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      throw new Error(`Ollama generate failed [${resp.status}]: ${resp.statusText}`)
    }
    const data = await resp.json() as OllamaGenerateResponse
    if (typeof data.response !== 'string') {
      throw new Error('Ollama generate response shape unexpected')
    }
    return data.response
  }
}
