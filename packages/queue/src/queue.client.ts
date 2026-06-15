import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import type { IngestionJobPayload } from './job-types.js'

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
})

export const ingestionQueue = new Queue<IngestionJobPayload>('ingestion', {
  connection: redisConnection,
})
