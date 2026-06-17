import 'dotenv/config'
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { createLogger } from '@rip/shared-utils'

const log = createLogger('Bootstrap')

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true, logger: ['error', 'warn', 'log'] })
  app.setGlobalPrefix('api/v1')
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' })

  if (process.env.NODE_ENV !== 'production') {
    // @ts-ignore — @bull-board/api/bullMQAdapter is a valid sub-path but may not be typed
    const { createBullBoard } = await import('@bull-board/api')
    // @ts-ignore
    const { BullMQAdapter } = await import('@bull-board/api/bullMQAdapter.js')
    const { ExpressAdapter } = await import('@bull-board/express')
    const { ingestionQueue } = await import('@rip/queue')
    const serverAdapter = new ExpressAdapter()
    serverAdapter.setBasePath('/admin/queues')
    // @ts-ignore — BullMQ 5.x JobProgress includes string; @bull-board types haven't caught up
    createBullBoard({ queues: [new BullMQAdapter(ingestionQueue)], serverAdapter })
    const expressApp = app.getHttpAdapter().getInstance()
    expressApp.use('/admin/queues', serverAdapter.getRouter())
    log.info('Bull Board mounted at /admin/queues')
  }

  const port = parseInt(process.env.PORT ?? '3001', 10)
  await app.listen(port)
  log.info(`API listening on port ${port}`)
}

bootstrap()
