import AdmZip from "adm-zip"
import path from "path"
import fs from "fs/promises"
import { createLogger, IngestionError } from "@rip/shared-utils"

const log = createLogger("ZipExtractor")

export class ZipExtractor {
  async extract(zipPath: string, targetDir: string): Promise<string> {
    log.info("Extracting ZIP", { zipPath, targetDir })
    await fs.mkdir(targetDir, { recursive: true })

    let zip: AdmZip
    try {
      zip = new AdmZip(zipPath)
    } catch (err) {
      throw new IngestionError(`Cannot read ZIP file: ${zipPath}`, err)
    }

    zip.extractAllTo(targetDir, true)

    // If ZIP has single top-level folder, return it as root
    const entries = await fs.readdir(targetDir)
    if (entries.length === 1) {
      const single = path.join(targetDir, entries[0]!)
      const stat = await fs.stat(single)
      if (stat.isDirectory()) return single
    }

    return targetDir
  }

  static repoNameFromZipPath(zipPath: string): string {
    return path.basename(zipPath, path.extname(zipPath))
  }
}
