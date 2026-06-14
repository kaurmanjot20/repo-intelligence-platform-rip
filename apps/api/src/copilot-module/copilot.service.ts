import { Injectable, Inject } from "@nestjs/common"
import { createLogger } from "@rip/shared-utils"
import type {
  IChatRepo, IChunkRepo, LLMProvider,
  CopilotAnswer, CopilotIntent,
} from "@rip/types"
import { GraphRetriever, VectorRefiner, IntentDetector } from "@rip/retrieval-engine"
import { ContextBuilder } from "@rip/memory-engine"

const log = createLogger("CopilotService")

const COPILOT_MAX_TOKENS = 600
const MAX_REFERENCES = 5

@Injectable()
export class CopilotService {
  private readonly intentDetector = new IntentDetector()

  constructor(
    @Inject("IChatRepo") private readonly chatRepo: IChatRepo,
    @Inject("IChunkRepo") private readonly chunkRepo: IChunkRepo,
    @Inject("ILLMProvider") private readonly llm: LLMProvider,
    @Inject("GraphRetriever") private readonly graphRetriever: GraphRetriever,
    @Inject("VectorRefiner") private readonly vectorRefiner: VectorRefiner,
    @Inject("ContextBuilder") private readonly contextBuilder: ContextBuilder,
  ) {}

  async ask(
    repositoryId: string,
    question: string,
    sessionId?: string
  ): Promise<CopilotAnswer> {
    const t0 = Date.now()

    const resolvedSessionId = sessionId
      ?? (await this.chatRepo.createSession(repositoryId)).id
    await this.chatRepo.addMessage(resolvedSessionId, "user", question)

    const intent: CopilotIntent = this.intentDetector.detect(question)

    const graphNodes = await this.graphRetriever.retrieve(repositoryId, question, intent)
    const nodeIds = graphNodes.map(n => n.id)

    const chunks = await this.vectorRefiner.refine(repositoryId, question, nodeIds)

    const prompt = this.contextBuilder.buildPrompt(question, graphNodes, chunks)
    const answer = await this.llm.generate(prompt, { maxTokens: COPILOT_MAX_TOKENS })

    const references = chunks.slice(0, MAX_REFERENCES).map(c => ({
      nodeId: c.nodeId,
      file: c.filePath,
      name: c.name,
    }))

    const durationMs = Date.now() - t0
    await this.chatRepo.addMessage(resolvedSessionId, "assistant", answer, references)

    log.info("Copilot answered", { repositoryId, intent, durationMs, refCount: references.length })

    return { answer, references, intent, sessionId: resolvedSessionId, durationMs }
  }

  async getMessages(sessionId: string) {
    return this.chatRepo.getMessages(sessionId)
  }
}
