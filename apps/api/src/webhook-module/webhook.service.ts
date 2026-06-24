import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from "@nestjs/common"
import { createHmac, createHash, timingSafeEqual } from "crypto"
import { createLogger } from "@rip/shared-utils"
import type { IRepositoryRepo, IIngestionJobRepo, IWebhookEventRepo, WebhookEventStatus } from "@rip/types"
import { ingestionQueue } from "@rip/queue"

const log = createLogger("WebhookService")

interface GitHubPushPayload {
  ref: string
  after: string
  repository: {
    full_name: string
    default_branch: string
  }
  head_commit: { id: string; message: string } | null
}

function verifySignature(rawBody: Buffer, secret: string, header: string): boolean {
  if (!header?.startsWith("sha256=")) return false
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(header))
  } catch {
    return false
  }
}

@Injectable()
export class WebhookService {
  constructor(
    @Inject("IRepositoryRepo") private readonly repoRepo: IRepositoryRepo,
    @Inject("IWebhookEventRepo") private readonly webhookEventRepo: IWebhookEventRepo,
    @Inject("IIngestionJobRepo") private readonly jobRepo: IIngestionJobRepo,
  ) {}

  async handleWebhook(
    repositoryId: string,
    rawBody: Buffer,
    deliveryId: string,
    event: string,
    signature: string,
  ): Promise<{ received: boolean }> {
    // Step 1: idempotency check before any repo lookup
    if (!deliveryId) throw new BadRequestException("Missing X-GitHub-Delivery header")
    const existing = await this.webhookEventRepo.findByDeliveryId(deliveryId)
    if (existing) {
      log.info("Duplicate delivery — already processed", { deliveryId, repositoryId })
      return { received: true }
    }

    // Step 2: load repo
    const repo = await this.repoRepo.findById(repositoryId)
    if (!repo) throw new NotFoundException(`Repository ${repositoryId} not found`)

    // Step 3: check webhook is configured
    if (!repo.webhookConfigured) {
      throw new BadRequestException("Webhook not configured for this repository")
    }

    // Step 4: load secret and verify signature
    const secret = await this.repoRepo.findWebhookSecret(repositoryId)
    if (!secret || !verifySignature(rawBody, secret, signature)) {
      throw new UnauthorizedException("Invalid webhook signature")
    }

    // Step 5: create audit record immediately after verification
    const payloadHash = createHash("sha256").update(rawBody).digest("hex")
    const webhookEvent = await this.webhookEventRepo.create({
      repositoryId,
      eventType: event,
      deliveryId,
      payloadHash,
    })

    // Step 6: handle non-push events
    if (event === "ping") {
      await this.finalize(repositoryId, webhookEvent.id, "SKIPPED")
      log.info("Ping event acknowledged", { repositoryId, deliveryId })
      return { received: true }
    }
    if (event !== "push") {
      await this.finalize(repositoryId, webhookEvent.id, "SKIPPED")
      return { received: true }
    }

    // Step 7: parse push payload
    const payload = JSON.parse(rawBody.toString("utf8")) as GitHubPushPayload

    // Step 8: check branch — compare against repo's trackedBranch or default_branch from payload
    const trackedBranch = repo.trackedBranch ?? payload.repository.default_branch ?? "main"
    const trackedRef = `refs/heads/${trackedBranch}`
    if (payload.ref !== trackedRef) {
      log.info("Push to non-tracked branch, skipping", { repositoryId, ref: payload.ref, trackedRef })
      await this.finalize(repositoryId, webhookEvent.id, "SKIPPED")
      return { received: true }
    }

    // Step 9: skip if the pushed commit is already ingested
    if (payload.after && payload.after === repo.currentCommitHash) {
      log.info("Push commit already ingested, skipping", { repositoryId, commit: payload.after })
      await this.finalize(repositoryId, webhookEvent.id, "SKIPPED")
      return { received: true }
    }

    // Step 10: enqueue ingestion job
    try {
      const job = await this.jobRepo.create(repositoryId)
      await ingestionQueue.add(
        "ingest",
        {
          repositoryId,
          jobId: job.id,
          triggeredBy: "webhook" as const,
          webhookEventId: webhookEvent.id,
        },
        { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
      )
      await this.finalize(repositoryId, webhookEvent.id, "ACCEPTED")
      log.info("Webhook accepted, ingestion queued", { repositoryId, jobId: job.id, deliveryId })
      return { received: true }
    } catch (err) {
      const msg = (err as Error).message
      log.error("Failed to enqueue ingestion job", { repositoryId, error: msg })
      await this.finalize(repositoryId, webhookEvent.id, "FAILED", msg)
      throw new InternalServerErrorException("Failed to process webhook")
    }
  }

  private async finalize(
    repositoryId: string,
    eventId: string,
    status: WebhookEventStatus,
    errorMessage?: string,
  ): Promise<void> {
    const now = new Date()
    await Promise.all([
      this.webhookEventRepo.updateStatus(eventId, status, { processedAt: now, errorMessage }),
      this.repoRepo.updateWebhookStatus(repositoryId, status, now),
    ])
  }
}
