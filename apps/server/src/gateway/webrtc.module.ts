import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WebrtcGateway } from './webrtc.gateway';
import { RoomModule } from '../room/room.module';

@Module({
  // JwtModule is registered globally in AuthModule, but imported explicitly here
  // to make the dependency visible and survive potential future de-globalisation.
  // PrismaService is provided globally via PrismaModule (@Global).
  imports: [RoomModule, JwtModule],
  providers: [WebrtcGateway],
})
export class WebrtcModule {}
