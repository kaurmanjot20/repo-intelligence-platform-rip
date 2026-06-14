import { Controller, Get, Param, Query, Inject, NotFoundException } from "@nestjs/common"
import type { IGraphRepository, NodeFilters, NodeType } from "@rip/types"

@Controller("repositories/:repositoryId/graph")
export class GraphController {
  constructor(
    @Inject("IGraphRepository") private readonly graphRepo: IGraphRepository,
  ) {}

  @Get("summary")
  async getSummary(@Param("repositoryId") repositoryId: string) {
    return this.graphRepo.getGraphSummary(repositoryId)
  }

  @Get("nodes")
  async getNodes(
    @Param("repositoryId") repositoryId: string,
    @Query("types") types?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const filters: NodeFilters = {}
    if (types) filters.types = types.split(",") as NodeType[]
    if (limit) filters.limit = parseInt(limit, 10)
    if (offset) filters.offset = parseInt(offset, 10)
    return this.graphRepo.getNodes(repositoryId, filters)
  }

  @Get("edges")
  async getEdges(@Param("repositoryId") repositoryId: string) {
    return this.graphRepo.getEdges(repositoryId)
  }

  @Get("nodes/:nodeId")
  async getNode(@Param("nodeId") nodeId: string) {
    try {
      return await this.graphRepo.getNodeWithRelationships(nodeId)
    } catch {
      throw new NotFoundException(`Node ${nodeId} not found`)
    }
  }

  @Get("path")
  async findPath(
    @Query("from") sourceId: string,
    @Query("to") targetId: string,
  ) {
    return this.graphRepo.findPath(sourceId, targetId)
  }
}
