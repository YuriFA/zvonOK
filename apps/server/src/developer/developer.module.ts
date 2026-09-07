import { Module } from '@nestjs/common';
import { EgressModule } from 'src/egress/egress.module';
import { DeveloperController } from './developer.controller';
import { DeveloperService } from './developer.service';
import { DevJwtStrategy } from './strategies/dev-jwt.strategy';

@Module({
  imports: [EgressModule],
  controllers: [DeveloperController],
  providers: [DeveloperService, DevJwtStrategy],
})
export class DeveloperModule {}
