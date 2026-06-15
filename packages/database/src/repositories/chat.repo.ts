import { getPrismaClient } from '../prisma.service'
import type { IChatRepo, CopilotReference, CopilotMessageMetric } from '@rip/types'
import { createLogger } from '@rip/shared-utils'
import type { Prisma } from '@prisma/client'

const log = createLogger('ChatRepo')

export class ChatRepo implements IChatRepo {
  private get db() { return getPrismaClient() }

  async createSession(repositoryId: string): Promise<{ id: string }> {
    const session = await this.db.chatSession.create({
      data: { repositoryId },
      select: { id: true },
    })
    log.debug('Session created', { sessionId: session.id })
    return session
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    references?: CopilotReference[]
  ): Promise<{ id: string }> {
    const msg = await this.db.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
        references: references
          ? (references as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      select: { id: true },
    })
    return msg
  }

  async getMessages(sessionId: string): Promise<Array<{
    role: 'user' | 'assistant'
    content: string
    references?: CopilotReference[]
    createdAt: Date
  }>> {
    const rows = await this.db.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(r => ({
      role: r.role as 'user' | 'assistant',
      content: r.content,
      references: r.references
        ? (r.references as unknown as CopilotReference[])
        : undefined,
      createdAt: r.createdAt,
    }))
  }

  async rateMessage(messageId: string, rating: 1 | -1): Promise<void> {
    await this.db.chatMessage.update({
      where: { id: messageId },
      data: { rating },
    })
  }

  async getAssistantMessages(repositoryId: string, limit: number): Promise<CopilotMessageMetric[]> {
    const rows = await this.db.chatMessage.findMany({
      where: { session: { repositoryId }, role: 'assistant' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, durationMs: true, rating: true, content: true, createdAt: true },
    })
    return rows.map((r) => ({
      id: r.id,
      durationMs: r.durationMs ?? null,
      rating: r.rating ?? null,
      content: r.content,
      createdAt: r.createdAt,
    }))
  }
}
