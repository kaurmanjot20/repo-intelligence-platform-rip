import { createHmac } from "crypto"
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common"

// Avoid constructing the real BullMQ queue (which would open a Redis connection).
const queueAdd = jest.fn()
jest.mock("@rip/queue", () => ({ ingestionQueue: { add: (...a: unknown[]) => queueAdd(...a) } }))

import { WebhookService } from "../webhook.service"

const SECRET = "test-secret"

function sign(body: Buffer): string {
  return "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex")
}

function pushBody(over: Partial<{ ref: string; after: string }> = {}): Buffer {
  return Buffer.from(
    JSON.stringify({
      ref: over.ref ?? "refs/heads/main",
      after: over.after ?? "newcommit",
      repository: { full_name: "acme/repo", default_branch: "main" },
      head_commit: { id: over.after ?? "newcommit", message: "msg" },
    }),
  )
}

function makeService(repoOverrides: Record<string, unknown> = {}) {
  const repoRepo = {
    findById: jest.fn().mockResolvedValue({
      id: "repo1",
      webhookConfigured: true,
      trackedBranch: "main",
      currentCommitHash: "oldcommit",
      ...repoOverrides,
    }),
    findWebhookSecret: jest.fn().mockResolvedValue(SECRET),
    updateWebhookStatus: jest.fn().mockResolvedValue(undefined),
  }
  const webhookEventRepo = {
    findByDeliveryId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: "evt1" }),
    updateStatus: jest.fn().mockResolvedValue(undefined),
  }
  const jobRepo = { create: jest.fn().mockResolvedValue({ id: "job1" }) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new WebhookService(repoRepo as any, webhookEventRepo as any, jobRepo as any)
  return { service, repoRepo, webhookEventRepo, jobRepo }
}

describe("WebhookService.handleWebhook", () => {
  beforeEach(() => queueAdd.mockClear())

  it("rejects a missing delivery id", async () => {
    const { service } = makeService()
    const body = pushBody()
    await expect(
      service.handleWebhook("repo1", body, "", "push", sign(body)),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("acknowledges a duplicate delivery without enqueueing", async () => {
    const { service, webhookEventRepo, jobRepo } = makeService()
    webhookEventRepo.findByDeliveryId.mockResolvedValue({ id: "evt-existing" })
    const body = pushBody()
    const res = await service.handleWebhook("repo1", body, "d1", "push", sign(body))
    expect(res).toEqual({ received: true })
    expect(jobRepo.create).not.toHaveBeenCalled()
    expect(queueAdd).not.toHaveBeenCalled()
  })

  it("404s when the repository is unknown", async () => {
    const { service, repoRepo } = makeService()
    repoRepo.findById.mockResolvedValue(null)
    const body = pushBody()
    await expect(
      service.handleWebhook("repo1", body, "d1", "push", sign(body)),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it("rejects when the webhook is not configured", async () => {
    const { service } = makeService({ webhookConfigured: false })
    const body = pushBody()
    await expect(
      service.handleWebhook("repo1", body, "d1", "push", sign(body)),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it("rejects an invalid signature", async () => {
    const { service } = makeService()
    const body = pushBody()
    await expect(
      service.handleWebhook("repo1", body, "d1", "push", "sha256=bogus"),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it("enqueues ingestion for a new commit on the tracked branch", async () => {
    const { service, jobRepo, webhookEventRepo } = makeService()
    const body = pushBody({ after: "newcommit" })
    const res = await service.handleWebhook("repo1", body, "d1", "push", sign(body))
    expect(res).toEqual({ received: true })
    expect(jobRepo.create).toHaveBeenCalledWith("repo1")
    expect(queueAdd).toHaveBeenCalledTimes(1)
    expect(webhookEventRepo.updateStatus).toHaveBeenCalledWith(
      "evt1",
      "ACCEPTED",
      expect.anything(),
    )
  })

  it("skips when the pushed commit is already ingested", async () => {
    const { service, jobRepo, webhookEventRepo } = makeService({ currentCommitHash: "samecommit" })
    const body = pushBody({ after: "samecommit" })
    const res = await service.handleWebhook("repo1", body, "d1", "push", sign(body))
    expect(res).toEqual({ received: true })
    expect(jobRepo.create).not.toHaveBeenCalled()
    expect(queueAdd).not.toHaveBeenCalled()
    expect(webhookEventRepo.updateStatus).toHaveBeenCalledWith(
      "evt1",
      "SKIPPED",
      expect.anything(),
    )
  })

  it("skips a push to a non-tracked branch", async () => {
    const { service, jobRepo } = makeService()
    const body = pushBody({ ref: "refs/heads/feature" })
    const res = await service.handleWebhook("repo1", body, "d1", "push", sign(body))
    expect(res).toEqual({ received: true })
    expect(jobRepo.create).not.toHaveBeenCalled()
  })

  it("skips non-push events", async () => {
    const { service, jobRepo } = makeService()
    const body = pushBody()
    const res = await service.handleWebhook("repo1", body, "d1", "ping", sign(body))
    expect(res).toEqual({ received: true })
    expect(jobRepo.create).not.toHaveBeenCalled()
  })
})
