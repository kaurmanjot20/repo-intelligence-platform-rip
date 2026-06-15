import {
  Controller, Post, Get, Delete, Param, Body, Query,
  HttpCode, HttpStatus, NotFoundException, Inject,
} from "@nestjs/common"
import { createLogger } from "@rip/shared-utils"
import type { IRepositoryRepo, IIngestionJobRepo } from "@rip/types"
import { ingestionQueue } from "@rip/queue"

const log = createLogger("IngestionController")

interface StartIngestionDto {
  sourceType?: "github_url" | "zip_upload"
  sourceUrl?: string
  localPath?: string
  name?: string
  workspaceId?: string
}

@Controller()
export class IngestionController {
  constructor(
    @Inject("IRepositoryRepo") private readonly repoRepo: IRepositoryRepo,
    @Inject("IIngestionJobRepo") private readonly jobRepo: IIngestionJobRepo,
  ) {}

  @Post("repositories")
  @HttpCode(HttpStatus.ACCEPTED)
  async startIngestion(@Body() dto: StartIngestionDto) {
    const name = dto.name ?? (dto.sourceUrl ? dto.sourceUrl.split("/").pop()! : "repository")
    const resolvedType = dto.sourceType ?? (dto.sourceUrl ? "github_url" : "zip_upload")

    const repo = await this.repoRepo.create({
      workspaceId: dto.workspaceId ?? "local-workspace",
      name,
      sourceType: resolvedType === "github_url" ? "GITHUB_URL" : "ZIP_UPLOAD",
      sourceUrl: dto.sourceUrl,
      localPath: dto.localPath ?? "",
    })

    const job = await this.jobRepo.create(repo.id)

    await ingestionQueue.add(
      "ingest",
      { repositoryId: repo.id, jobId: job.id, triggeredBy: "api" },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    )

    log.info("Ingestion queued", { repositoryId: repo.id, jobId: job.id })
    return { repositoryId: repo.id, jobId: job.id, status: "pending" }
  }

  @Get("repositories")
  async listRepositories(@Query("workspaceId") workspaceId = "local-workspace") {
    return this.repoRepo.findByWorkspace(workspaceId)
  }

  @Get("repositories/:id")
  async getRepository(@Param("id") id: string) {
    const repo = await this.repoRepo.findById(id)
    if (!repo) throw new NotFoundException(`Repository ${id} not found`)
    return repo
  }

  @Delete("repositories/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRepository(@Param("id") id: string) {
    const repo = await this.repoRepo.findById(id)
    if (!repo) throw new NotFoundException()
    await this.repoRepo.softDelete(id)
  }

  @Get("jobs/:jobId")
  async getJob(@Param("jobId") jobId: string) {
    const job = await this.jobRepo.findById(jobId)
    if (!job) throw new NotFoundException(`Job ${jobId} not found`)
    return job
  }
}
