import { createHash } from 'crypto'

export function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}
