import crypto from "crypto"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { DiffStrategy } from "../diff-strategy"
import type { IParsedFileRepo } from "@rip/types"

const sha = (s: string) => crypto.createHash("sha256").update(Buffer.from(s)).digest("hex")

async function makeRepoDir(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "diff-test-"))
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, content)
  }
  return dir
}

function repoStub(records: { path: string; contentHash: string }[]): IParsedFileRepo {
  // Only findForDiff is exercised by computeDiff.
  return { findForDiff: jest.fn().mockResolvedValue(records) } as unknown as IParsedFileRepo
}

describe("DiffStrategy.computeDiff", () => {
  it("buckets files into changed, new, deleted, and unchanged", async () => {
    const dir = await makeRepoDir({
      "a.ts": "export const a = 1",
      "b.ts": "export const b = 2",
      "c.ts": "export const c = 3",
    })
    try {
      const repo = repoStub([
        { path: "a.ts", contentHash: sha("export const a = 1") }, // unchanged
        { path: "b.ts", contentHash: sha("old contents") }, // changed
        { path: "d.ts", contentHash: sha("gone") }, // deleted (not on disk)
      ])
      const result = await new DiffStrategy(repo).computeDiff(dir, "repo1")

      expect(result.unchangedFiles).toEqual(["a.ts"])
      expect(result.changedFiles).toEqual(["b.ts"])
      expect(result.newFiles).toEqual(["c.ts"])
      expect(result.deletedFiles).toEqual(["d.ts"])
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  it("ignores node_modules and unsupported extensions", async () => {
    const dir = await makeRepoDir({
      "keep.ts": "x",
      "notes.txt": "ignored — unsupported extension",
      "node_modules/dep.ts": "ignored — vendored",
    })
    try {
      const result = await new DiffStrategy(repoStub([])).computeDiff(dir, "repo1")
      expect(result.newFiles).toEqual(["keep.ts"])
      expect(result.changedFiles).toEqual([])
      expect(result.deletedFiles).toEqual([])
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })
})
