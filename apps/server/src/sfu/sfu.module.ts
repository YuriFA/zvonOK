import { Module } from '@nestjs/common';
import { SfuService } from './sfu.service';
import { SfuGateway } from './sfu.gateway';
import { WorkerManager } from './worker-manager';
import { RoomTokenHelper } from '../platform/room-token.helper';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  providers: [SfuService, SfuGateway, WorkerManager, RoomTokenHelper],
  exports: [SfuService, SfuGateway],
})
export class SfuModule {}
