import { getPrismaClient } from '../prisma.service'
import type { IWebhookEventRepo, WebhookEventData, CreateWebhookEventDto } from '@rip/types'
import type { WebhookEventStatus } from '@rip/types'

export class WebhookEventRepo implements IWebhookEventRepo {
  private get db() { return getPrismaClient() }

  async create(data: CreateWebhookEventDto): Promise<WebhookEventData> {
    const row = await this.db.webhookEvent.create({
      data: {
        repositoryId: data.repositoryId,
        eventType: data.eventType,
        deliveryId: data.deliveryId,
        payloadHash: data.payloadHash,
      },
    })
    return this.toData(row)
  }

  async findByDeliveryId(deliveryId: string): Promise<WebhookEventData | null> {
    const row = await this.db.webhookEvent.findUnique({ where: { deliveryId } })
    return row ? this.toData(row) : null
  }

  async updateStatus(
    id: string,
    status: WebhookEventStatus,
    opts?: { errorMessage?: string; processedAt?: Date },
  ): Promise<void> {
    await this.db.webhookEvent.update({
      where: { id },
      data: {
        status: status as any,
        errorMessage: opts?.errorMessage ?? null,
        processedAt: opts?.processedAt ?? null,
      },
    })
  }

  private toData(row: any): WebhookEventData {
    return {
      id: row.id,
      repositoryId: row.repositoryId,
      eventType: row.eventType,
      deliveryId: row.deliveryId,
      receivedAt: row.receivedAt,
      processedAt: row.processedAt ?? undefined,
      status: row.status as WebhookEventStatus,
      payloadHash: row.payloadHash,
      errorMessage: row.errorMessage ?? undefined,
    }
  }
}
