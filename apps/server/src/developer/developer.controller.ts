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
import { DeveloperService } from './developer.service';
import { DevJwtGuard } from './guards/dev-jwt.guard';
import { DevAccount } from './decorators/dev-account.decorator';
import type { DevAccountIdentity } from './decorators/dev-account.decorator';
import {
  CreateProjectDto,
  LoginDeveloperDto,
  RegisterDeveloperDto,
} from './dto/developer.dto';

@ApiTags('developers')
@Controller('developers')
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Post('auth/register')
  @HttpCode(HttpStatus.CREATED)
  @SkipAuthGuard()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a developer account' })
  register(@Body() dto: RegisterDeveloperDto) {
    return this.developerService.register(dto);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @SkipAuthGuard()
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login as a developer' })
  login(@Body() dto: LoginDeveloperDto) {
    return this.developerService.login(dto);
  }

  @Post('projects')
  @HttpCode(HttpStatus.CREATED)
  @SkipAuthGuard()
  @UseGuards(DevJwtGuard)
  @ApiOperation({ summary: 'Create a project' })
  createProject(
    @DevAccount() account: DevAccountIdentity,
    @Body() dto: CreateProjectDto,
  ) {
    return this.developerService.createProject(account.id, dto);
  }

  @Post('projects/:id/keys')
  @HttpCode(HttpStatus.CREATED)
  @SkipAuthGuard()
  @UseGuards(DevJwtGuard)
  @ApiOperation({ summary: 'Create an API key (full key shown once)' })
  createApiKey(
    @DevAccount() account: DevAccountIdentity,
    @Param('id') projectId: string,
  ) {
    return this.developerService.createApiKey(account.id, projectId);
  }

  @Get('projects/:id/keys')
  @SkipAuthGuard()
  @UseGuards(DevJwtGuard)
  @ApiOperation({ summary: 'List API keys (metadata only)' })
  listApiKeys(
    @DevAccount() account: DevAccountIdentity,
    @Param('id') projectId: string,
  ) {
    return this.developerService.listApiKeys(account.id, projectId);
  }

  @Delete('keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipAuthGuard()
  @UseGuards(DevJwtGuard)
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeApiKey(
    @DevAccount() account: DevAccountIdentity,
    @Param('id') keyId: string,
  ) {
    await this.developerService.revokeApiKey(account.id, keyId);
  }
}
