import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from "@nestjs/common"
import { createLogger } from "@rip/shared-utils"
import type {
  IRepositoryRepo,
  IGraphRepository,
  IPrAnalysisResultRepo,
  PrAnalysisResultData,
  ImpactedNode,
  GraphNode,
} from "@rip/types"
import type { LLMProvider } from "@rip/types"
import { VectorRefiner } from "@rip/retrieval-engine"
import { GithubClient } from "./github.client.js"

const log = createLogger("PrAnalysisService")

const MAX_IMPACTED_NODES = 50
const MAX_CONTEXT_CHARS = 2000
const TWO_HOP_THRESHOLD = 30

interface AnalyzePrDto {
  prUrl?: string
  baseSha?: string
  headSha?: string
}

@Injectable()
export class PrAnalysisService {
  constructor(
    @Inject("IRepositoryRepo") private readonly repoRepo: IRepositoryRepo,
    @Inject("IGraphRepository") private readonly graphRepo: IGraphRepository,
    @Inject("IPrAnalysisResultRepo") private readonly prAnalysisRepo: IPrAnalysisResultRepo,
    @Inject("ILLMProvider") private readonly llm: LLMProvider,
    @Inject("VectorRefiner") private readonly vectorRefiner: VectorRefiner,
    private readonly githubClient: GithubClient,
  ) {}

  async analyze(repositoryId: string, dto: AnalyzePrDto): Promise<PrAnalysisResultData> {
    const t0 = Date.now()

    const repo = await this.repoRepo.findById(repositoryId)
    if (!repo) throw new NotFoundException(`Repository ${repositoryId} not found`)

    // 1. Fetch changed files from GitHub
    let changedFiles: string[]
    if (dto.prUrl) {
      const files = await this.githubClient.getFilesForPr(dto.prUrl)
      changedFiles = files.filter((f) => f.status !== "removed").map((f) => f.filename)
    } else if (dto.baseSha && dto.headSha) {
      if (!repo.sourceUrl) {
        throw new UnprocessableEntityException(
          "baseSha/headSha requires a GitHub-sourced repository with a sourceUrl",
        )
      }
      const files = await this.githubClient.getFilesForCommits(
        repo.sourceUrl,
        dto.baseSha,
        dto.headSha,
      )
      changedFiles = files.filter((f) => f.status !== "removed").map((f) => f.filename)
    } else {
      throw new BadRequestException("Provide prUrl or both baseSha and headSha")
    }

    log.info("PR files fetched", { repositoryId, count: changedFiles.length })

    // 2. Find direct graph nodes for changed files
    const directNodes = await this.graphRepo.getNodesForFiles(repositoryId, changedFiles)

    // 3. Find 1-hop callers/importers
    const callers1 = await this.graphRepo.getCallersOf(repositoryId, changedFiles)

    // 4. Optional 2-hop if below threshold
    let callers2: Array<{ node: GraphNode; relationship: string }> = []
    if (callers1.length < TWO_HOP_THRESHOLD) {
      const callerFilePaths = [
        ...new Set(
          callers1
            .map((c) => (c.node.metadata as Record<string, unknown>)["filePath"] as string)
            .filter(Boolean),
        ),
      ]
      if (callerFilePaths.length > 0) {
        callers2 = await this.graphRepo.getCallersOf(repositoryId, callerFilePaths)
      }
    }

    // 5. Build impacted nodes list — deduplicate, cap at MAX_IMPACTED_NODES
    const seen = new Set<string>()
    const impactedNodes: ImpactedNode[] = []

    for (const { node, relationship } of [...callers1, ...callers2]) {
      if (seen.has(node.id) || impactedNodes.length >= MAX_IMPACTED_NODES) continue
      seen.add(node.id)
      impactedNodes.push({
        nodeId: node.id,
        file: ((node.metadata as Record<string, unknown>)["filePath"] as string) ?? "",
        name: node.label,
        relationship: relationship as "CALLS" | "IMPORTS",
      })
    }

    // 6. Vector search for code context
    const allNodeIds = [
      ...directNodes.map((n) => n.id),
      ...impactedNodes.map((n) => n.nodeId),
    ].slice(0, 20)

    const queryText =
      changedFiles.join(" ") + " " + directNodes.map((n) => n.label).join(" ")

    const chunks =
      allNodeIds.length > 0
        ? await this.vectorRefiner.refine(repositoryId, queryText, allNodeIds)
        : []

    // 7. LLM impact summary
    const summary = await this.generateSummary(changedFiles, directNodes, impactedNodes, chunks)

    const references = chunks.slice(0, 5).map((c) => ({
      nodeId: c.nodeId,
      file: c.filePath,
      name: c.name,
    }))

    const durationMs = Date.now() - t0
    log.info("PR analysis complete", {
      repositoryId,
      changedFiles: changedFiles.length,
      impactedNodes: impactedNodes.length,
      durationMs,
    })

    return this.prAnalysisRepo.create({
      repositoryId,
      prUrl: dto.prUrl,
      baseSha: dto.baseSha,
      headSha: dto.headSha,
      changedFiles,
      summary,
      impactedNodes,
      references,
      durationMs,
    })
  }

  private async generateSummary(
    changedFiles: string[],
    directNodes: GraphNode[],
    impactedNodes: ImpactedNode[],
    chunks: Array<{ filePath: string; content: string }>,
  ): Promise<string> {
    const directSummary =
      directNodes.length > 0
        ? directNodes
            .map(
              (n) =>
                `${n.label} (${n.type}) in ${
                  (n.metadata as Record<string, unknown>)["filePath"] ?? "unknown"
                }`,
            )
            .join("\n")
        : "none found in graph"

    const impactSummary =
      impactedNodes.length > 0
        ? impactedNodes.map((n) => `${n.name} in ${n.file} [${n.relationship}]`).join("\n")
        : "none found"

    const codeContext = chunks
      .map((c) => `// ${c.filePath}\n${c.content}`)
      .join("\n\n")
      .slice(0, MAX_CONTEXT_CHARS)

    const prompt = `SYSTEM: You are a code impact analyst. Given a list of changed files and the graph nodes they affect (callers, importers, dependents), explain the blast radius of this change concisely. Be specific. Use file names. Do not speculate about bugs — only describe structural impact.

CHANGED FILES:
${changedFiles.join("\n")}

DIRECTLY AFFECTED NODES:
${directSummary}

UPSTREAM DEPENDENTS (callers/importers):
${impactSummary}

CODE CONTEXT:
${codeContext}

Write a 3-5 sentence impact summary. Then list the most critical files to review or test.`

    return this.llm.generate(prompt, { maxTokens: 400 })
  }
}
