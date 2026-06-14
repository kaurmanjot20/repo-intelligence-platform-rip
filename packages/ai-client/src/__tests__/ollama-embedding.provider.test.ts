import { OllamaEmbeddingProvider } from '../providers/ollama-embedding.provider'

const mockFetch = jest.fn()
let originalFetch: typeof fetch

beforeAll(() => { originalFetch = global.fetch })
afterEach(() => {
  global.fetch = originalFetch
  mockFetch.mockClear()
})
beforeEach(() => {
  global.fetch = mockFetch as unknown as typeof fetch
})

describe('OllamaEmbeddingProvider', () => {
  let provider: OllamaEmbeddingProvider

  beforeEach(() => {
    provider = new OllamaEmbeddingProvider('http://localhost:11434')
  })

  it('returns 768-dimensional embedding from Ollama response', async () => {
    const embedding = Array.from({ length: 768 }, (_, i) => i * 0.001)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: [embedding] }),
    })

    const result = await provider.embed('function authenticate(user)')

    expect(result).toHaveLength(768)
    expect(result[0]).toBeCloseTo(0)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/embed',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws on non-ok Ollama response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' })
    await expect(provider.embed('text')).rejects.toThrow('Ollama embed failed [500]')
  })

  it('returns correct model and dimensions', () => {
    expect(provider.model).toBe('nomic-embed-text')
    expect(provider.dimensions).toBe(768)
  })

  it('handles batch of multiple texts in a single request', async () => {
    const embeddings = [
      Array.from({ length: 768 }, () => 0.1),
      Array.from({ length: 768 }, () => 0.2),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings }),
    })

    const result = await provider.embedBatch(['hello', 'world'])

    expect(result).toHaveLength(2)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.input).toEqual(['hello', 'world'])
  })

  it('throws when Ollama returns unexpected shape', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: [] }),
    })
    await expect(provider.embedBatch(['text'])).rejects.toThrow('Ollama embed response shape unexpected')
  })

  it('propagates network-level fetch rejection', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(provider.embed('text')).rejects.toThrow('ECONNREFUSED')
  })
})
