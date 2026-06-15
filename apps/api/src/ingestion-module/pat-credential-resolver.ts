import { Injectable, Inject } from "@nestjs/common"
import { decryptToken, buildAuthenticatedUrl } from "@rip/shared-utils"
import type { IRepositoryRepo, IRepositoryCredentialResolver } from "@rip/types"

@Injectable()
export class PatCredentialResolver implements IRepositoryCredentialResolver {
  constructor(
    @Inject("IRepositoryRepo") private readonly repoRepo: IRepositoryRepo,
  ) {}

  async getGithubToken(repositoryId: string): Promise<string | undefined> {
    const encrypted = await this.repoRepo.findGithubToken(repositoryId)
    if (!encrypted) return undefined
    return decryptToken(encrypted)
  }

  async getCloneUrl(repositoryId: string): Promise<string> {
    const repo = await this.repoRepo.findById(repositoryId)
    if (!repo?.sourceUrl) throw new Error(`No sourceUrl for repository ${repositoryId}`)
    const encrypted = await this.repoRepo.findGithubToken(repositoryId)
    if (!encrypted) return repo.sourceUrl
    let token: string | undefined
    try {
      token = decryptToken(encrypted)
      return buildAuthenticatedUrl(repo.sourceUrl, token)
    } finally {
      token = undefined
    }
  }
}
