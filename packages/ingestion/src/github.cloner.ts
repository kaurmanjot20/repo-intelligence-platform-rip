import simpleGit from "simple-git"
import path from "path"
import fs from "fs/promises"
import { createLogger, IngestionError } from "@rip/shared-utils"

const log = createLogger("GithubCloner")

export interface CloneResult {
  localPath: string
  commitHash: string
  defaultBranch: string
}

export class GithubCloner {
  async clone(url: string, targetDir: string): Promise<CloneResult> {
    log.info("Cloning repository", { url, targetDir })
    await fs.mkdir(targetDir, { recursive: true })

    const git = simpleGit()
    try {
      await git.clone(url, targetDir, ["--depth", "1"])
    } catch (err) {
      throw new IngestionError(`Failed to clone ${url}: ${(err as Error).message}`, err)
    }

    const repoGit = simpleGit(targetDir)
    const gitLog = await repoGit.log({ maxCount: 1 })
    const status = await repoGit.status()

    return {
      localPath: targetDir,
      commitHash: gitLog.latest?.hash ?? "unknown",
      defaultBranch: status.current ?? "main",
    }
  }

  static parseRepoName(url: string): string {
    const match = url.match(/\/([^/]+?)(?:\.git)?$/)
    return match?.[1] ?? "repository"
  }
}
