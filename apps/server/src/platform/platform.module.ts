import { Module } from '@nestjs/common';
import { RoomModule } from 'src/room/room.module';
import { SfuModule } from 'src/sfu/sfu.module';
import { EgressModule } from 'src/egress/egress.module';
import { PlatformController } from './platform.controller';
import { RecordingsController } from './recordings.controller';
import { PlatformService } from './platform.service';
import { RoomTokenHelper } from './room-token.helper';
import { ApiKeyGuard } from './guards/api-key.guard';
import { PlatformThrottlerGuard } from './guards/platform-throttler.guard';

@Module({
  imports: [RoomModule, SfuModule, EgressModule],
  controllers: [PlatformController, RecordingsController],
  providers: [
    PlatformService,
    RoomTokenHelper,
    ApiKeyGuard,
    PlatformThrottlerGuard,
  ],
})
export class PlatformModule {}
