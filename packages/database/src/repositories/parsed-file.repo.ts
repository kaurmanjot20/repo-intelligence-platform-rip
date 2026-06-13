import { getPrismaClient } from '../prisma.service'
import type { IParsedFileRepo, ParsedFile } from '@rip/types'
import { getAstPath } from '@rip/shared-utils'

export class ParsedFileRepo implements IParsedFileRepo {
  private get db() { return getPrismaClient() }

  async bulkCreate(files: ParsedFile[]): Promise<void> {
    const dataDir = process.env.DATA_DIR ?? './data/repositories'

    await this.db.parsedFile.createMany({
      data: files.map((f) => ({
        repositoryId: f.repositoryId,
        path: f.path,
        language: f.language,
        contentHash: f.contentHash,
        importCount: f.imports.length,
        exportCount: f.exports.length,
        classCount: f.classes.length,
        functionCount: f.functions.length,
        astPath: getAstPath(dataDir, f.repositoryId, f.path),
        parserVersion: f.metadata.parserVersion,
        parsedAt: f.metadata.parsedAt,
        parseDurationMs: f.metadata.parseDurationMs,
      })),
      skipDuplicates: true,
    })
  }

  async findByRepository(repositoryId: string): Promise<ParsedFile[]> {
    const rows = await this.db.parsedFile.findMany({ where: { repositoryId } })
    return rows.map((r) => ({
      id: r.id,
      repositoryId: r.repositoryId,
      path: r.path,
      language: r.language as any,
      contentHash: r.contentHash,
      imports: [],
      exports: [],
      classes: [],
      functions: [],
      frameworkHints: [],
      metadata: {
        parserVersion: r.parserVersion,
        parsedAt: r.parsedAt,
        parseDurationMs: r.parseDurationMs,
      },
    }))
  }

  async findByPath(repositoryId: string, filePath: string): Promise<ParsedFile | null> {
    const row = await this.db.parsedFile.findUnique({
      where: { repositoryId_path: { repositoryId, path: filePath } },
    })
    if (!row) return null
    return {
      id: row.id,
      repositoryId: row.repositoryId,
      path: row.path,
      language: row.language as any,
      contentHash: row.contentHash,
      imports: [],
      exports: [],
      classes: [],
      functions: [],
      frameworkHints: [],
      metadata: {
        parserVersion: row.parserVersion,
        parsedAt: row.parsedAt,
        parseDurationMs: row.parseDurationMs,
      },
    }
  }
}
