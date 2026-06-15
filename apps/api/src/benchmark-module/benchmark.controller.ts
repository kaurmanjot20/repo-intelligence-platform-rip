import { Controller, Get, Param } from "@nestjs/common"
import { BenchmarkService } from "./benchmark.service.js"

@Controller("repositories/:repositoryId/benchmarks")
export class BenchmarkController {
  constructor(private readonly benchmarkService: BenchmarkService) {}

  @Get("ingestion")
  async getIngestionMetrics(@Param("repositoryId") repositoryId: string) {
    return this.benchmarkService.getIngestionMetrics(repositoryId)
  }

  @Get("copilot")
  async getCopilotMetrics(@Param("repositoryId") repositoryId: string) {
    return this.benchmarkService.getCopilotMetrics(repositoryId)
  }
}
