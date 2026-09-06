import { Module } from '@nestjs/common';
import { RoomModule } from 'src/room/room.module';
import { SfuModule } from 'src/sfu/sfu.module';
import { WhiteboardGateway } from './whiteboard.gateway';
import { WhiteboardService } from './whiteboard.service';

@Module({
  imports: [RoomModule, SfuModule],
  providers: [WhiteboardService, WhiteboardGateway],
  exports: [WhiteboardService],
})
export class WhiteboardModule {}
