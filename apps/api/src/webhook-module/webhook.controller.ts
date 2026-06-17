import {
  Controller,
  Post,
  Param,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
} from "@nestjs/common"
import type { RawBodyRequest } from "@nestjs/common"
import { WebhookService } from "./webhook.service.js"

@Controller("repositories/:id/webhook")
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Param("id") repositoryId: string,
    @Req() req: RawBodyRequest<{ rawBody?: Buffer; body: unknown }>,
    @Headers("x-github-delivery") deliveryId: string,
    @Headers("x-github-event") event: string,
    @Headers("x-hub-signature-256") signature: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body))
    return this.webhookService.handleWebhook(
      repositoryId,
      rawBody,
      deliveryId,
      event,
      signature,
    )
  }
}
