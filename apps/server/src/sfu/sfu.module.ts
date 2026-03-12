import { Module } from '@nestjs/common';
import { SfuService } from './sfu.service';
import { SfuGateway } from './sfu.gateway';
import { WorkerManager } from './worker-manager';

@Module({
  providers: [SfuService, SfuGateway, WorkerManager],
  exports: [SfuService, SfuGateway],
})
export class SfuModule {}
