import { Injectable, Inject } from "@nestjs/common"
import { createLogger } from "@rip/shared-utils"
import type {
  IIngestionService, IParser, IGraphEngine, IMemoryEngine,
  IRepositoryRepo, IIngestionJobRepo, IParsedFileRepo,
} from "@rip/types"

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
  ) {}

  async startIngestion(repositoryId: string, jobId: string): Promise<void> {
    const t0 = Date.now()
    try {
      const repo = await this.repoRepo.findById(repositoryId)
      if (!repo) throw new Error(`Repository ${repositoryId} not found`)

      // 1. Clone / extract
      await this.repoRepo.updateStatus(repositoryId, "cloning")
      const ingested = repo.sourceType === "github_url"
        ? await this.ingestionSvc.ingestFromUrl(repo.sourceUrl!, repo.workspaceId)
        : await this.ingestionSvc.ingestFromZip(repo.localPath, repo.workspaceId)

      await this.repoRepo.updateStats(repositoryId, {
        languages: ingested.languages,
        fileCount: ingested.fileCount,
        currentCommitHash: ingested.commitHash,
        defaultBranch: ingested.defaultBranch,
      })

      // 2. Parse
      await this.repoRepo.updateStatus(repositoryId, "parsing")
      const t1 = Date.now()
      const parsedFiles = await this.parser.parseRepository(ingested.localPath, ingested.languages, repositoryId)
      const parseDurationMs = Date.now() - t1

      await this.parsedFileRepo.bulkCreate(parsedFiles)
      await this.repoRepo.updateStats(repositoryId, { parseDurationMs })

      // 3. Build graph
      await this.repoRepo.updateStatus(repositoryId, "building_graph")
      const graphResult = await this.graphEngine.buildGraph(repositoryId, parsedFiles)

      await this.repoRepo.updateStats(repositoryId, {
        nodeCount: graphResult.nodesCreated,
        edgeCount: graphResult.edgesCreated,
        graphBuildDurationMs: graphResult.durationMs,
        graphBuiltAt: new Date(),
        graphVersion: (repo.graphVersion ?? 0) + 1,
      })

      // 4. Index memory (non-fatal — graph still valid if Ollama unavailable)
      await this.repoRepo.updateStatus(repositoryId, "indexing")
      try {
        const t2 = Date.now()
        const { chunksIndexed } = await this.memoryEngine.buildMemory(repositoryId, parsedFiles)
        await this.repoRepo.updateStats(repositoryId, {
          chunkCount: chunksIndexed,
          indexedAt: new Date(),
        })
        log.info("Memory indexed", { repositoryId, chunksIndexed, ms: Date.now() - t2 })
      } catch (memErr) {
        log.warn("Memory indexing failed — copilot unavailable, graph still ready", {
          repositoryId,
          error: (memErr as Error).message,
        })
      }

      await this.repoRepo.updateStatus(repositoryId, "ready")
      await this.jobRepo.complete(jobId, {
        totalDurationMs: Date.now() - t0,
        parseDurationMs,
        graphBuildDurationMs: graphResult.durationMs,
        warnings: graphResult.warnings,
        nodesCreated: graphResult.nodesCreated,
        edgesCreated: graphResult.edgesCreated,
      })

      log.info("Ingestion complete", { repositoryId, ms: Date.now() - t0 })
    } catch (err) {
      const msg = (err as Error).message
      log.error("Ingestion failed", { repositoryId, error: msg })
      await this.repoRepo.updateStatus(repositoryId, "error", msg)
      await this.jobRepo.fail(jobId, msg)
    }
  }
}
