import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGO = "aes-256-gcm"
const IV_LEN = 12
const TAG_LEN = 16
const HEX_RE = /^[0-9a-fA-F]{64}$/

function key(): Buffer {
  const hex = process.env.ENCRYPTION_KEY ?? ""
  if (!HEX_RE.test(hex)) throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters")
  return Buffer.from(hex, "hex")
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LEN)
  const c = createCipheriv(ALGO, key(), iv)
  const ct = Buffer.concat([c.update(plaintext, "utf8"), c.final()])
  return "v1:" + Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64")
}

export function decryptToken(stored: string): string {
  if (!stored.startsWith("v1:")) throw new Error("Unknown token format")
  const b = Buffer.from(stored.slice(3), "base64")
  const iv = b.subarray(0, IV_LEN)
  const tag = b.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = b.subarray(IV_LEN + TAG_LEN)
  const d = createDecipheriv(ALGO, key(), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8")
}

export function buildAuthenticatedUrl(sourceUrl: string, token: string): string {
  const url = new URL(sourceUrl)
  url.username = "x-access-token"
  url.password = token
  return url.toString()
}
