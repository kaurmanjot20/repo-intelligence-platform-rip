import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { createLogger } from '@rip/shared-utils'

const log = createLogger('Bootstrap')

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] })
  app.setGlobalPrefix('api/v1')
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' })
  const port = parseInt(process.env.PORT ?? '3001', 10)
  await app.listen(port)
  log.info(`API listening on port ${port}`)
}

bootstrap()
