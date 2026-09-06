import { Module } from '@nestjs/common';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhookDispatcher } from './webhook-dispatcher.service';
import { WebhookQueue } from './webhook-queue';
import { WebhookSigner } from './webhook-signer';

@Module({
  providers: [
    WebhookDispatcher,
    WebhookDeliveryService,
    WebhookQueue,
    WebhookSigner,
  ],
  exports: [WebhookDispatcher],
})
export class WebhooksModule {}
