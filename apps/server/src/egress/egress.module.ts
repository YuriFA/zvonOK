import { Module } from '@nestjs/common';
import { SfuModule } from 'src/sfu/sfu.module';
import { WebhooksModule } from 'src/webhooks/webhooks.module';
import { EGRESS_HLS_DIR } from './egress.config';
import { EGRESS_HLS_ROOT } from './egress-playback.controller';
import { EgressPlaybackController } from './egress-playback.controller';
import { EgressService } from './egress.service';

@Module({
  imports: [SfuModule, WebhooksModule],
  controllers: [EgressPlaybackController],
  providers: [
    EgressService,
    { provide: EGRESS_HLS_ROOT, useValue: EGRESS_HLS_DIR },
  ],
  exports: [EgressService],
})
export class EgressModule {}
