import { ParserService } from "../parser.service"
import path from "path"
import fs from "fs"
import os from "os"

describe("ParserService", () => {
  const service = new ParserService("/tmp/rip-test-ast")

  it("parseFile detects TypeScript", async () => {
    const tmpFile = path.join(os.tmpdir(), "test.ts")
    fs.writeFileSync(tmpFile, "export function hello() { return 42 }")
    const result = await service.parseFile(tmpFile, "typescript")
    expect(result.language).toBe("typescript")
    expect(result.functions.length).toBeGreaterThanOrEqual(1)
    fs.unlinkSync(tmpFile)
  })

  it("parseFile detects Python", async () => {
    const tmpFile = path.join(os.tmpdir(), "test.py")
    fs.writeFileSync(tmpFile, "def hello():\n  return 42")
    const result = await service.parseFile(tmpFile, "python")
    expect(result.language).toBe("python")
    expect(result.functions.length).toBeGreaterThanOrEqual(1)
    fs.unlinkSync(tmpFile)
  })
})
