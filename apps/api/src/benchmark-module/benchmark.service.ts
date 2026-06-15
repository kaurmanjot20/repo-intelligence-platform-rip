import { Injectable, Inject } from "@nestjs/common"
import type { IIngestionMetricRepo, IngestionMetricData } from "@rip/types"
import type { IChatRepo, CopilotMessageMetric } from "@rip/types"

@Injectable()
export class BenchmarkService {
  constructor(
    @Inject("IIngestionMetricRepo") private readonly metricRepo: IIngestionMetricRepo,
    @Inject("IChatRepo") private readonly chatRepo: IChatRepo,
  ) {}

  async getIngestionMetrics(repositoryId: string): Promise<{ metrics: IngestionMetricData[] }> {
    const metrics = await this.metricRepo.findByRepository(repositoryId, 20)
    return { metrics }
  }

  async getCopilotMetrics(repositoryId: string): Promise<{ messages: CopilotMessageMetric[] }> {
    const messages = await this.chatRepo.getAssistantMessages(repositoryId, 100)
    return { messages }
  }
}
