import { Module } from '@nestjs/common';
import { DeveloperController } from './developer.controller';
import { DeveloperService } from './developer.service';
import { DevJwtStrategy } from './strategies/dev-jwt.strategy';

@Module({
  controllers: [DeveloperController],
  providers: [DeveloperService, DevJwtStrategy],
})
export class DeveloperModule {}
