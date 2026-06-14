import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import type { ParsedFile, Chunk } from '@rip/types'
import { createLogger } from '@rip/shared-utils'

const log = createLogger('Chunker')

const MAX_CHUNK_CHARS = 2000
const CLASS_PREVIEW_LINES = 10

export class Chunker {
  async chunkFiles(parsedFiles: ParsedFile[]): Promise<Chunk[]> {
    const all: Chunk[] = []
    for (const file of parsedFiles) {
      const chunks = await this.chunkFile(file)
      all.push(...chunks)
    }
    return all
  }

  async chunkFile(parsedFile: ParsedFile): Promise<Chunk[]> {
    let source: string
    try {
      source = await fs.readFile(parsedFile.path, 'utf-8')
    } catch (err) {
      log.warn('Could not read file — skipping', { path: parsedFile.path, error: (err as Error).message })
      return []
    }

    const lines = source.split('\n')
    const chunks: Chunk[] = []

    for (const fn of parsedFile.functions) {
      chunks.push({
        id: randomUUID(),
        repositoryId: parsedFile.repositoryId,
        nodeId: `${parsedFile.id}:${fn.name}`,
        filePath: parsedFile.path,
        nodeType: 'function',
        name: fn.name,
        content: this.extract(lines, fn.location.startLine, fn.location.endLine),
        startLine: fn.location.startLine,
        endLine: fn.location.endLine,
      })
    }

    for (const cls of parsedFile.classes) {
      const clsEnd = Math.min(cls.location.startLine + CLASS_PREVIEW_LINES, cls.location.endLine)
      chunks.push({
        id: randomUUID(),
        repositoryId: parsedFile.repositoryId,
        nodeId: `${parsedFile.id}:${cls.name}`,
        filePath: parsedFile.path,
        nodeType: 'class',
        name: cls.name,
        content: this.extract(lines, cls.location.startLine, clsEnd),
        startLine: cls.location.startLine,
        endLine: clsEnd,
      })

      for (const method of cls.methods) {
        chunks.push({
          id: randomUUID(),
          repositoryId: parsedFile.repositoryId,
          nodeId: `${parsedFile.id}:${cls.name}.${method.name}`,
          filePath: parsedFile.path,
          nodeType: 'method',
          name: `${cls.name}.${method.name}`,
          content: this.extract(lines, method.location.startLine, method.location.endLine),
          startLine: method.location.startLine,
          endLine: method.location.endLine,
        })
      }
    }

    if (parsedFile.functions.length === 0 && parsedFile.classes.length === 0) {
      const previewLines = lines.slice(0, 50)
      const joined = previewLines.join('\n').slice(0, MAX_CHUNK_CHARS)
      const actualEndLine = Math.min(joined.split('\n').length, lines.length)
      chunks.push({
        id: randomUUID(),
        repositoryId: parsedFile.repositoryId,
        nodeId: parsedFile.id,
        filePath: parsedFile.path,
        nodeType: 'file',
        name: path.basename(parsedFile.path),
        content: joined,
        startLine: 1,
        endLine: actualEndLine,
      })
    }

    return chunks
  }

  private extract(lines: string[], startLine: number, endLine: number): string {
    return lines.slice(startLine - 1, endLine).join('\n').slice(0, MAX_CHUNK_CHARS)
  }
}
