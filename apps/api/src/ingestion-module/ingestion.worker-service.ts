import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common"
import { Worker, UnrecoverableError } from "bullmq"
import { createLogger } from "@rip/shared-utils"
import { redisConnection } from "@rip/queue"
import type { IngestionJobPayload } from "@rip/queue"
import { IngestionOrchestrator } from "./ingestion.orchestrator"

const log = createLogger("IngestionWorkerService")

const WORKER_CONCURRENCY = 1

@Injectable()
export class IngestionWorkerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private worker!: Worker<IngestionJobPayload>

  constructor(private readonly orchestrator: IngestionOrchestrator) {}

  onApplicationBootstrap(): void {
    this.worker = new Worker<IngestionJobPayload>(
      "ingestion",
      async (job) => {
        try {
          await this.orchestrator.startIngestion(job.data.repositoryId, job.data.jobId, job.data.webhookEventId)
        } catch (err) {
          const msg = (err as Error).message
          if (
            msg.includes("not found") ||
            msg.includes("Invalid URL") ||
            msg.includes("authentication required")
          ) {
            throw new UnrecoverableError(msg)
          }
          throw err
        }
      },
      {
        connection: redisConnection,
        concurrency: WORKER_CONCURRENCY,
      }
    )
    log.info("Ingestion worker started", { concurrency: WORKER_CONCURRENCY })
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker.close()
    log.info("Ingestion worker stopped")
  }
}
