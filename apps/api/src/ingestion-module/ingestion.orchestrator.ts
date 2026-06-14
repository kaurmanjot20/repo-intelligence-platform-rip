import { Injectable, Inject } from "@nestjs/common"
import { createLogger } from "@rip/shared-utils"
import type {
  IIngestionService,
  IParser,
  IGraphEngine,
  IRepositoryRepo,
  IIngestionJobRepo,
  IParsedFileRepo,
  DiffResult,
} from "@rip/types"
import type { IMemoryEngine, IChunkRepo } from "@rip/types"
import { DiffStrategy } from "@rip/ingestion"

const log = createLogger("IngestionOrchestrator")

@Injectable()
export class IngestionOrchestrator {
  constructor(
    @Inject("IIngestionService") private readonly ingestionSvc: IIngestionService,
    @Inject("IParser") private readonly parser: IParser,
    @Inject("IGraphEngine") private readonly graphEngine: IGraphEngine,
    @Inject("IMemoryEngine") private readonly memoryEngine: IMemoryEngine,
    @Inject("IRepositoryRepo") private readonly repoRepo: IRepositoryRepo,
    @Inject("IIngestionJobRepo") private readonly jobRepo: IIngestionJobRepo,
    @Inject("IParsedFileRepo") private readonly parsedFileRepo: IParsedFileRepo,
    @Inject("IChunkRepo") private readonly chunkRepo: IChunkRepo,
  ) {}

  async startIngestion(repositoryId: string, jobId: string): Promise<void> {
    const t0 = Date.now()
    try {
      const repo = await this.repoRepo.findById(repositoryId)
      if (!repo) throw new Error(`Repository ${repositoryId} not found`)

      // Detect re-ingest vs first-time ingest
      const existingFiles = await this.parsedFileRepo.findForDiff(repositoryId)
      const isReIngest = existingFiles.length > 0

      // 1. Clone / pull
      const cloneStatus = isReIngest ? "re_ingesting" : "cloning"
      await this.repoRepo.updateStatus(repositoryId, cloneStatus)
      const ingested = repo.sourceType === "github_url"
        ? await this.ingestionSvc.ingestFromUrl(repo.sourceUrl!, repositoryId)
        : await this.ingestionSvc.ingestFromZip(repo.localPath, repositoryId)

      await this.repoRepo.updateStats(repositoryId, {
        languages: ingested.languages,
        fileCount: ingested.fileCount,
        currentCommitHash: ingested.commitHash,
        defaultBranch: ingested.defaultBranch,
        localPath: ingested.localPath,
      })

      // 2. Compute diff or treat everything as new (first ingest)
      let diff: DiffResult
      if (isReIngest) {
        const diffStrategy = new DiffStrategy(this.parsedFileRepo)
        diff = await diffStrategy.computeDiff(ingested.localPath, repositoryId)
      } else {
        diff = { changedFiles: [], newFiles: [], deletedFiles: [], unchangedFiles: [] }
      }

      // 3. Delete stale graph nodes and chunks for changed + deleted files
      const staleFiles = [...diff.changedFiles, ...diff.deletedFiles]
      if (staleFiles.length > 0) {
        await this.graphEngine.deleteNodesForFiles(repositoryId, staleFiles)
        await this.chunkRepo.deleteByFilePaths(repositoryId, staleFiles)
      }
      if (diff.deletedFiles.length > 0) {
        await this.parsedFileRepo.bulkDelete(repositoryId, diff.deletedFiles)
      }

      // 4. Parse only changed+new files (or all on first ingest)
      await this.repoRepo.updateStatus(repositoryId, "parsing")
      const t1 = Date.now()
      let parsedFiles
      if (isReIngest) {
        const filesToParse = [...diff.changedFiles, ...diff.newFiles]
        parsedFiles = filesToParse.length > 0
          ? await this.parser.parseFiles(
              ingested.localPath,
              filesToParse,
              ingested.languages,
              repositoryId,
            )
          : []
      } else {
        parsedFiles = await this.parser.parseRepository(
          ingested.localPath,
          ingested.languages,
          repositoryId,
        )
      }
      const parseDurationMs = Date.now() - t1

      // 5. Persist ParsedFile rows
      if (isReIngest) {
        await this.parsedFileRepo.bulkUpsert(parsedFiles)
      } else {
        await this.parsedFileRepo.bulkCreate(parsedFiles)
      }

      // 6. Build graph for new/changed files only (or all on first ingest)
      await this.repoRepo.updateStatus(repositoryId, "building_graph")
      const t2 = Date.now()
      const graphResult = await this.graphEngine.buildGraph(repositoryId, parsedFiles)
      const graphBuildDurationMs = Date.now() - t2

      await this.repoRepo.updateStats(repositoryId, {
        nodeCount: graphResult.nodesCreated,
        edgeCount: graphResult.edgesCreated,
        graphBuildDurationMs,
        graphBuiltAt: new Date(),
        graphVersion: (repo.graphVersion ?? 0) + 1,
      })

      // 7. Index memory for new/changed files only (non-fatal — graph is still valid)
      await this.repoRepo.updateStatus(repositoryId, "indexing")
      let embedDurationMs = 0
      try {
        const t3 = Date.now()
        const { chunksIndexed } = await this.memoryEngine.buildMemory(repositoryId, parsedFiles)
        embedDurationMs = Date.now() - t3
        await this.repoRepo.updateStats(repositoryId, {
          chunkCount: chunksIndexed,
          indexedAt: new Date(),
        })
        log.info("Memory indexed", { repositoryId, chunksIndexed, ms: embedDurationMs })
      } catch (memErr) {
        log.warn("Memory indexing failed — copilot unavailable, graph still ready", {
          repositoryId,
          error: (memErr as Error).message,
        })
      }

      await this.repoRepo.updateStatus(repositoryId, "ready")
      const totalDurationMs = Date.now() - t0

      const metadata: Record<string, unknown> = {
        totalDurationMs,
        parseDurationMs,
        graphBuildDurationMs,
        embedDurationMs,
        warnings: graphResult.warnings,
        nodesCreated: graphResult.nodesCreated,
        edgesCreated: graphResult.edgesCreated,
        isReIngest,
      }
      if (isReIngest) {
        metadata.changedFiles = diff.changedFiles.length
        metadata.newFiles = diff.newFiles.length
        metadata.deletedFiles = diff.deletedFiles.length
        metadata.unchangedFiles = diff.unchangedFiles.length
      }

      await this.jobRepo.complete(jobId, metadata)
      log.info("Ingestion complete", { repositoryId, isReIngest, ms: totalDurationMs })

    } catch (err) {
      const msg = (err as Error).message
      log.error("Ingestion failed", { repositoryId, error: msg })
      await this.repoRepo.updateStatus(repositoryId, "error", msg)
      await this.jobRepo.fail(jobId, msg)
    }
  }
}
