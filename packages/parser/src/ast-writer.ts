import fs from "fs/promises"
import path from "path"
import type { ParsedFile } from "@rip/types"
import { createLogger } from "@rip/shared-utils"

const log = createLogger("AstWriter")

export class AstWriter {
  constructor(private readonly dataDir: string) {}

  async write(parsedFile: ParsedFile): Promise<string> {
    const safeRelPath = parsedFile.path.replace(/[/\\]/g, "-").replace(/^-/, "")
    const astPath = path.join(this.dataDir, parsedFile.repositoryId, "ast", `${safeRelPath}.json`)

    await fs.mkdir(path.dirname(astPath), { recursive: true })
    await fs.writeFile(astPath, JSON.stringify(parsedFile, null, 2), "utf-8")

    log.debug("AST written", { path: astPath })
    return astPath
  }

  async readIfExists(repositoryId: string, filePath: string): Promise<ParsedFile | null> {
    const safeRelPath = filePath.replace(/[/\\]/g, "-").replace(/^-/, "")
    const astPath = path.join(this.dataDir, repositoryId, "ast", `${safeRelPath}.json`)
    try {
      const content = await fs.readFile(astPath, "utf-8")
      return JSON.parse(content) as ParsedFile
    } catch {
      return null
    }
  }
}
