import { Module } from "@nestjs/common"
import { HealthController } from "./health/health.controller"
import { IngestionController } from "./ingestion-module/ingestion.controller"
import { IngestionOrchestrator } from "./ingestion-module/ingestion.orchestrator"
import { RepositoryRepo, IngestionJobRepo, ParsedFileRepo } from "@rip/database"
import { IngestionService } from "@rip/ingestion"
import type { IParser, IGraphEngine, GraphBuildResult } from "@rip/types"

// Stubs — replaced in Sprint 3 and Sprint 4
const parserStub: IParser = {
  parseRepository: async () => [],
  parseFile: async () => { throw new Error("Not implemented") },
}
const graphStub: IGraphEngine = {
  buildGraph: async (): Promise<GraphBuildResult> => ({
    repositoryId: "", nodesCreated: 0, edgesCreated: 0, durationMs: 0, warnings: [],
  }),
}

@Module({
  controllers: [HealthController, IngestionController],
  providers: [
    IngestionOrchestrator,
    { provide: "IRepositoryRepo", useClass: RepositoryRepo },
    { provide: "IIngestionJobRepo", useClass: IngestionJobRepo },
    { provide: "IParsedFileRepo", useClass: ParsedFileRepo },
    { provide: "IIngestionService", useClass: IngestionService },
    { provide: "IParser", useValue: parserStub },
    { provide: "IGraphEngine", useValue: graphStub },
  ],
})
export class AppModule {}
