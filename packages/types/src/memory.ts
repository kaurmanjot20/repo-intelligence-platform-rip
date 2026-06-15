import type { ParsedFile } from './parser'

export type CopilotIntent =
  | 'find-ownership'
  | 'trace-flow'
  | 'explain-arch'
  | 'locate-logic'
  | 'explain-deps'

export type ChunkNodeType = 'function' | 'class' | 'method' | 'file'

export interface Chunk {
  id: string
  repositoryId: string
  nodeId: string
  filePath: string
  nodeType: ChunkNodeType
  name: string
  content: string
  startLine: number
  endLine: number
}

export interface CopilotReference {
  nodeId: string
  file: string
  name: string
}

export interface CopilotAnswer {
  answer: string
  references: CopilotReference[]
  intent: CopilotIntent
  sessionId: string
  durationMs: number
  messageId: string
}

export interface CopilotMessageMetric {
  id: string
  durationMs: number | null
  rating: number | null
  content: string
  createdAt: Date
}

export interface IMemoryEngine {
  buildMemory(
    repositoryId: string,
    parsedFiles: ParsedFile[]
  ): Promise<{ chunksIndexed: number; durationMs: number }>
  getChunkCount(repositoryId: string): Promise<number>
}

export interface IChunkRepo {
  bulkUpsert(chunks: Array<Chunk & { embedding: number[] }>): Promise<void>
  similaritySearch(
    repositoryId: string,
    queryEmbedding: number[],
    nodeIds: string[],
    limit?: number
  ): Promise<Array<Chunk & { similarity: number }>>
  deleteByRepository(repositoryId: string): Promise<void>
  countByRepository(repositoryId: string): Promise<number>
  deleteByFilePaths(repositoryId: string, filePaths: string[]): Promise<number>
}

export interface IChatRepo {
  createSession(repositoryId: string): Promise<{ id: string }>
  addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    references?: CopilotReference[]
  ): Promise<{ id: string }>
  getMessages(sessionId: string): Promise<Array<{
    role: 'user' | 'assistant'
    content: string
    references?: CopilotReference[]
    createdAt: Date
  }>>
  rateMessage(messageId: string, rating: 1 | -1): Promise<void>
  getAssistantMessages(repositoryId: string, limit: number): Promise<CopilotMessageMetric[]>
}
