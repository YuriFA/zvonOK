import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SkipAuthGuard } from 'src/auth/skip-auth.guard';
import { PlatformService } from './platform.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { PlatformThrottlerGuard } from './guards/platform-throttler.guard';
import { ApiKey } from './decorators/api-key.decorator';
import type { ApiKeyContext } from './guards/api-key.guard';
import { CreatePlatformRoomDto, MintRoomTokenDto } from './dto/platform.dto';

@ApiTags('platform')
@Controller('v1')
@SkipAuthGuard()
@UseGuards(ApiKeyGuard, PlatformThrottlerGuard)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Post('rooms')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a room owned by the key project' })
  createRoom(@ApiKey() key: ApiKeyContext, @Body() dto: CreatePlatformRoomDto) {
    return this.platformService.createRoom(key.projectId, dto);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'List rooms of the key project' })
  listRooms(@ApiKey() key: ApiKeyContext) {
    return this.platformService.listRooms(key.projectId);
  }

  @Delete('rooms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End a project room' })
  async endRoom(@ApiKey() key: ApiKeyContext, @Param('id') roomId: string) {
    await this.platformService.endRoom(key.projectId, roomId);
  }

  @Post('rooms/:id/tokens')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Mint a short-lived participant room token' })
  mintRoomToken(
    @ApiKey() key: ApiKeyContext,
    @Param('id') roomId: string,
    @Body() dto: MintRoomTokenDto,
  ) {
    return this.platformService.mintRoomToken(
      key.projectId,
      key.id,
      roomId,
      dto,
    );
  }
}
