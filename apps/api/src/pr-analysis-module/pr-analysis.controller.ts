import { Controller, Post, Param, Body, HttpCode, HttpStatus } from "@nestjs/common"
import { PrAnalysisService } from "./pr-analysis.service.js"

interface AnalyzePrDto {
  prUrl?: string
  baseSha?: string
  headSha?: string
}

@Controller("repositories/:repositoryId/pr-analysis")
export class PrAnalysisController {
  constructor(private readonly prAnalysisService: PrAnalysisService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async analyze(
    @Param("repositoryId") repositoryId: string,
    @Body() dto: AnalyzePrDto,
  ) {
    return this.prAnalysisService.analyze(repositoryId, dto)
  }
}
