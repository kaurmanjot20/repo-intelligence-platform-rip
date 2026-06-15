import path from "path"
import fs from "fs/promises"
import { glob } from "glob"
import simpleGit from "simple-git"
import { createLogger } from "@rip/shared-utils"
import type { IIngestionService, IngestionResult, SupportedLanguage } from "@rip/types"
import { GithubCloner } from "./github.cloner.js"
import { ZipExtractor } from "./zip.extractor.js"
import { LanguageDetector } from "./language.detector.js"

const log = createLogger("IngestionService")
const IGNORE_PATTERNS = ["node_modules/**", ".git/**", "dist/**", "__pycache__/**", "*.class"]

export class IngestionService implements IIngestionService {
  private readonly cloner = new GithubCloner()
  private readonly extractor = new ZipExtractor()
  private readonly detector = new LanguageDetector()

  constructor(private readonly dataDir = process.env.DATA_DIR ?? "./data/repositories") {}

  async ingestFromUrl(url: string, repositoryId: string): Promise<IngestionResult> {
    const stablePath = path.join(this.dataDir, repositoryId, "source")
    log.info("Ingesting from URL", { repositoryId, stablePath })

    let localPath: string
    let commitHash: string
    let defaultBranch: string

    const isExistingRepo = await this.isGitRepo(stablePath)
    if (isExistingRepo) {
      const git = simpleGit(stablePath)
      const statusBefore = await git.status()
      defaultBranch = statusBefore.current ?? "main"
      await git.fetch("origin")
      await git.reset(["--hard", `origin/${defaultBranch}`])
      const gitLog = await git.log({ maxCount: 1 })
      commitHash = gitLog.latest?.hash ?? "unknown"
      localPath = stablePath
      log.info("Repository pulled", { url, commitHash })
    } else {
      const result = await this.cloner.clone(url, stablePath)
      localPath = result.localPath
      commitHash = result.commitHash
      defaultBranch = result.defaultBranch
    }

    const allFiles = await glob("**/*", { cwd: localPath, nodir: true, ignore: IGNORE_PATTERNS })
    const languages = this.detector.detectFromFilePaths(allFiles)

    return {
      repositoryId,
      localPath,
      languages,
      fileCount: allFiles.length,
      commitHash,
      defaultBranch,
    }
  }

  async ingestFromZip(zipPath: string, repositoryId: string): Promise<IngestionResult> {
    const tempId = `tmp-${Date.now()}`
    const sourcePath = path.join(this.dataDir, tempId, "source")
    log.info("Ingesting from ZIP", { zipPath })
    const localPath = await this.extractor.extract(zipPath, sourcePath)
    const allFiles = await glob("**/*", { cwd: localPath, nodir: true, ignore: IGNORE_PATTERNS })
    const languages = this.detector.detectFromFilePaths(allFiles)
    return {
      repositoryId,
      localPath,
      languages,
      fileCount: allFiles.length,
    }
  }

  async detectLanguages(repositoryPath: string): Promise<SupportedLanguage[]> {
    const allFiles = await glob("**/*", {
      cwd: repositoryPath,
      nodir: true,
      ignore: IGNORE_PATTERNS,
    })
    return this.detector.detectFromFilePaths(allFiles)
  }

  private async isGitRepo(dir: string): Promise<boolean> {
    try {
      await fs.access(path.join(dir, ".git"))
      return true
    } catch {
      return false
    }
  }
}
