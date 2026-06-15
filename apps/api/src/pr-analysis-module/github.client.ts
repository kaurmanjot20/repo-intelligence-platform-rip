import { Injectable, UnprocessableEntityException } from "@nestjs/common"
import { createLogger } from "@rip/shared-utils"

const log = createLogger("GithubClient")

export interface PrFile {
  filename: string
  status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged"
}

@Injectable()
export class GithubClient {
  private readonly baseUrl = "https://api.github.com"

  private buildHeaders(token?: string): Record<string, string> {
    const authToken = token ?? process.env.GITHUB_TOKEN
    return {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }
  }

  async getFilesForPr(prUrl: string, token?: string): Promise<PrFile[]> {
    const { owner, repo, prNumber } = this.parsePrUrl(prUrl)
    log.info("Fetching PR files", { owner, repo, prNumber })
    const res = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
      { headers: this.buildHeaders(token) },
    )
    if (!res.ok) {
      const body = await res.text()
      throw new UnprocessableEntityException(`GitHub API error ${res.status}: ${body}`)
    }
    return res.json() as Promise<PrFile[]>
  }

  async getFilesForCommits(
    sourceUrl: string,
    baseSha: string,
    headSha: string,
    token?: string,
  ): Promise<PrFile[]> {
    const { owner, repo } = this.parseRepoUrl(sourceUrl)
    log.info("Fetching commit diff", { owner, repo, baseSha, headSha })
    const res = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/compare/${baseSha}...${headSha}`,
      { headers: this.buildHeaders(token) },
    )
    if (!res.ok) {
      const body = await res.text()
      throw new UnprocessableEntityException(`GitHub API error ${res.status}: ${body}`)
    }
    const data = (await res.json()) as { files?: PrFile[] }
    return data.files ?? []
  }

  private parsePrUrl(url: string): { owner: string; repo: string; prNumber: number } {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
    if (!match) {
      throw new UnprocessableEntityException(`Invalid GitHub PR URL: ${url}`)
    }
    return { owner: match[1]!, repo: match[2]!, prNumber: parseInt(match[3]!, 10) }
  }

  private parseRepoUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^/]+)\/([^/.]+)/)
    if (!match) {
      throw new UnprocessableEntityException(`Cannot parse GitHub URL: ${url}`)
    }
    return { owner: match[1]!, repo: match[2]!.replace(/\.git$/, "") }
  }
}
