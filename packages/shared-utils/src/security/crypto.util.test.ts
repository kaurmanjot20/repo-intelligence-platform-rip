import { encryptToken, decryptToken, buildAuthenticatedUrl } from "./crypto.util"

const VALID_KEY = "a".repeat(64)

describe("encryptToken / decryptToken", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = VALID_KEY
  })

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY
  })

  test("round-trips a PAT", () => {
    const plain = "ghp_test_token_abc123"
    expect(decryptToken(encryptToken(plain))).toBe(plain)
  })

  test("same input produces different ciphertext (random IV)", () => {
    const a = encryptToken("token")
    const b = encryptToken("token")
    expect(a).not.toBe(b)
  })

  test("stored value has v1: prefix", () => {
    expect(encryptToken("token")).toMatch(/^v1:/)
  })

  test("decryptToken throws on unknown format", () => {
    expect(() => decryptToken("v99:garbage")).toThrow("Unknown token format")
  })

  test("encryptToken throws on invalid key", () => {
    const saved = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = "not-hex"
    expect(() => encryptToken("token")).toThrow("ENCRYPTION_KEY must be exactly 64 hex characters")
    process.env.ENCRYPTION_KEY = saved
  })

  test("encryptToken throws on missing key", () => {
    const saved = process.env.ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY
    expect(() => encryptToken("token")).toThrow("ENCRYPTION_KEY must be exactly 64 hex characters")
    process.env.ENCRYPTION_KEY = saved
  })

  test("encryptToken throws on key that is hex-like but wrong length", () => {
    const saved = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = "abc123"
    expect(() => encryptToken("token")).toThrow("ENCRYPTION_KEY must be exactly 64 hex characters")
    process.env.ENCRYPTION_KEY = saved
  })
})

describe("buildAuthenticatedUrl", () => {
  test("embeds x-access-token as username", () => {
    const url = buildAuthenticatedUrl("https://github.com/owner/repo", "mytoken")
    expect(url).toContain("x-access-token:mytoken@github.com")
  })

  test("preserves owner/repo path", () => {
    const url = buildAuthenticatedUrl("https://github.com/owner/repo", "tok")
    expect(url).toMatch(/\/owner\/repo/)
  })
})
