import crypto from "crypto"
import fs from "fs/promises"
import { glob } from "glob"
import { createLogger } from "@rip/shared-utils"
import type { IParsedFileRepo, DiffResult } from "@rip/types"

const log = createLogger("DiffStrategy")

const IGNORE_PATTERNS = ["node_modules/**", ".git/**", "dist/**", "__pycache__/**", "*.class"]
const SUPPORTED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".java"]

export class DiffStrategy {
  constructor(private readonly parsedFileRepo: IParsedFileRepo) {}

  async computeDiff(localPath: string, repositoryId: string): Promise<DiffResult> {
    // 1. Walk disk — relative paths only, supported extensions only
    const allOnDisk = await glob("**/*", {
      cwd: localPath,
      nodir: true,
      ignore: IGNORE_PATTERNS,
    })
    const supportedOnDisk = allOnDisk.filter((f) =>
      SUPPORTED_EXTENSIONS.some((ext) => f.endsWith(ext)),
    )

    // 2. Compute SHA-256 for each file
    const diskHashes = new Map<string, string>()
    for (const relPath of supportedOnDisk) {
      const absPath = `${localPath}/${relPath}`
      const content = await fs.readFile(absPath)
      const hash = crypto.createHash("sha256").update(content).digest("hex")
      diskHashes.set(relPath, hash)
    }

    // 3. Load DB records: { path, contentHash }
    const dbRecords = await this.parsedFileRepo.findForDiff(repositoryId)
    const dbMap = new Map(dbRecords.map((r) => [r.path, r.contentHash]))

    // 4. Bucket files
    const changedFiles: string[] = []
    const newFiles: string[] = []
    const unchangedFiles: string[] = []

    for (const [relPath, hash] of diskHashes) {
      const dbHash = dbMap.get(relPath)
      if (dbHash === undefined) {
        newFiles.push(relPath)
      } else if (dbHash !== hash) {
        changedFiles.push(relPath)
      } else {
        unchangedFiles.push(relPath)
      }
    }

    // 5. deletedFiles = in DB but not on disk
    const diskSet = new Set(supportedOnDisk)
    const deletedFiles = dbRecords
      .filter((r) => !diskSet.has(r.path))
      .map((r) => r.path)

    log.info("Diff computed", {
      repositoryId,
      changed: changedFiles.length,
      new: newFiles.length,
      deleted: deletedFiles.length,
      unchanged: unchangedFiles.length,
    })

    return { changedFiles, newFiles, deletedFiles, unchangedFiles }
  }
}
