import { Controller, Post, Get, Body, Param, BadRequestException, HttpCode, HttpStatus } from "@nestjs/common"
import { CopilotService } from "./copilot.service.js"

interface AskDto {
  question: string
  sessionId?: string
}

@Controller("repositories/:repositoryId/copilot")
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Post("ask")
  async ask(
    @Param("repositoryId") repositoryId: string,
    @Body() dto: AskDto
  ) {
    if (!dto.question) throw new BadRequestException("question is required")
    return this.copilotService.ask(repositoryId, dto.question, dto.sessionId)
  }

  @Get("sessions/:sessionId/messages")
  async getMessages(@Param("sessionId") sessionId: string) {
    return this.copilotService.getMessages(sessionId)
  }

  @Post("messages/:messageId/rate")
  @HttpCode(HttpStatus.NO_CONTENT)
  async rateMessage(
    @Param("messageId") messageId: string,
    @Body() dto: { rating: 1 | -1 },
  ) {
    await this.copilotService.rateMessage(messageId, dto.rating)
  }
}
