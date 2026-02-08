import { Module } from '@nestjs/common';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { RoomCleanupService } from './cleanup.service';

@Module({
  controllers: [RoomController],
  providers: [RoomService, RoomCleanupService],
  exports: [RoomService],
})
export class RoomModule {}
