import { PrismaClient } from '@prisma/client'
import { createLogger } from '@rip/shared-utils'

const log = createLogger('PrismaService')

let instance: PrismaClient | null = null

export function getPrismaClient(): PrismaClient {
  if (!instance) {
    instance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
    log.info('PrismaClient initialized')
  }
  return instance
}

export async function disconnectPrisma(): Promise<void> {
  if (instance) {
    await instance.$disconnect()
    instance = null
  }
}
