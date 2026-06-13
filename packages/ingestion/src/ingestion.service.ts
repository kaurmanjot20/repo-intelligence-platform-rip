import path from "path"
import { glob } from "glob"
import { createLogger } from "@rip/shared-utils"
import type { IIngestionService, IngestionResult, SupportedLanguage } from "@rip/types"
import { GithubCloner } from "./github.cloner"
import { ZipExtractor } from "./zip.extractor"
import { LanguageDetector } from "./language.detector"

const log = createLogger("IngestionService")
const IGNORE_PATTERNS = ["node_modules/**", ".git/**", "dist/**", "__pycache__/**", "*.class"]

export class IngestionService implements IIngestionService {
  private readonly cloner = new GithubCloner()
  private readonly extractor = new ZipExtractor()
  private readonly detector = new LanguageDetector()

  constructor(private readonly dataDir = process.env.DATA_DIR ?? "./data/repositories") {}

  async ingestFromUrl(url: string, workspaceId: string): Promise<IngestionResult> {
    const tempId = `tmp-${Date.now()}`
    const sourcePath = path.join(this.dataDir, tempId, "source")

    log.info("Ingesting from URL", { url })
    const { localPath, commitHash, defaultBranch } = await this.cloner.clone(url, sourcePath)

    const allFiles = await glob("**/*", { cwd: localPath, nodir: true, ignore: IGNORE_PATTERNS })
    const languages = this.detector.detectFromFilePaths(allFiles)

    return { repositoryId: tempId, localPath, languages, fileCount: allFiles.length, commitHash, defaultBranch }
  }

  async ingestFromZip(zipPath: string, workspaceId: string): Promise<IngestionResult> {
    const tempId = `tmp-${Date.now()}`
    const sourcePath = path.join(this.dataDir, tempId, "source")

    log.info("Ingesting from ZIP", { zipPath })
    const localPath = await this.extractor.extract(zipPath, sourcePath)

    const allFiles = await glob("**/*", { cwd: localPath, nodir: true, ignore: IGNORE_PATTERNS })
    const languages = this.detector.detectFromFilePaths(allFiles)

    return { repositoryId: tempId, localPath, languages, fileCount: allFiles.length }
  }

  async detectLanguages(repositoryPath: string): Promise<SupportedLanguage[]> {
    const allFiles = await glob("**/*", { cwd: repositoryPath, nodir: true, ignore: IGNORE_PATTERNS })
    return this.detector.detectFromFilePaths(allFiles)
  }
}
