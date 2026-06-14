import { Module } from "@nestjs/common"
import { HealthController } from "./health/health.controller"
import { IngestionController } from "./ingestion-module/ingestion.controller"
import { IngestionOrchestrator } from "./ingestion-module/ingestion.orchestrator"
import { GraphController } from "./graph-module/graph.controller"
import { CopilotController } from "./copilot-module/copilot.controller"
import { CopilotService } from "./copilot-module/copilot.service"
import { RepositoryRepo, IngestionJobRepo, ParsedFileRepo, ChunkRepo, ChatRepo } from "@rip/database"
import { IngestionService } from "@rip/ingestion"
import { ParserService } from "@rip/parser"
import { Neo4jClient, GraphEngine, GraphRepository } from "@rip/graph-engine"
import { OllamaEmbeddingProvider, OllamaLLMProvider } from "@rip/ai-client"
import { MemoryEngine, ContextBuilder } from "@rip/memory-engine"
import { GraphRetriever, VectorRefiner } from "@rip/retrieval-engine"

const neo4jClient = new Neo4jClient()
const chunkRepo = new ChunkRepo()
const chatRepo = new ChatRepo()
const ollamaEmbedding = new OllamaEmbeddingProvider()
const ollamaLlm = new OllamaLLMProvider()
const memoryEngine = new MemoryEngine(ollamaEmbedding, chunkRepo)
const graphRetriever = new GraphRetriever(neo4jClient)
const vectorRefiner = new VectorRefiner(chunkRepo, ollamaEmbedding)
const contextBuilder = new ContextBuilder()

@Module({
  controllers: [HealthController, IngestionController, GraphController, CopilotController],
  providers: [
    IngestionOrchestrator,
    CopilotService,
    { provide: "IRepositoryRepo", useClass: RepositoryRepo },
    { provide: "IIngestionJobRepo", useClass: IngestionJobRepo },
    { provide: "IParsedFileRepo", useClass: ParsedFileRepo },
    { provide: "IIngestionService", useClass: IngestionService },
    { provide: "IParser", useClass: ParserService },
    { provide: "IGraphEngine", useFactory: () => new GraphEngine(neo4jClient) },
    { provide: "IGraphRepository", useFactory: () => new GraphRepository(neo4jClient) },
    { provide: "IMemoryEngine", useValue: memoryEngine },
    { provide: "IEmbeddingProvider", useValue: ollamaEmbedding },
    { provide: "ILLMProvider", useValue: ollamaLlm },
    { provide: "IChunkRepo", useValue: chunkRepo },
    { provide: "IChatRepo", useValue: chatRepo },
    { provide: "GraphRetriever", useValue: graphRetriever },
    { provide: "VectorRefiner", useValue: vectorRefiner },
    { provide: "ContextBuilder", useValue: contextBuilder },
  ],
})
export class AppModule {}
