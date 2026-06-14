import { getPrismaClient } from '../prisma.service'
import type { IChatRepo, CopilotReference } from '@rip/types'
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
  ): Promise<void> {
    await this.db.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
        references: references
          ? (references as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    })
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
}
