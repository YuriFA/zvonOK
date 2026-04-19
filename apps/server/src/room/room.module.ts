import { Module } from '@nestjs/common';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { RoomCleanupService } from './cleanup.service';
import { GuestService } from './guest.service';
import { SfuModule } from '../sfu/sfu.module';

@Module({
  imports: [SfuModule],
  controllers: [RoomController],
  providers: [RoomService, RoomCleanupService, GuestService],
  exports: [RoomService],
})
export class RoomModule {}
