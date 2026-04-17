import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { User } from '../user/decorators/user.decorator';
import { JwtPayloadDto } from '../auth/dto/jwt-payload.dto';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('messages')
@Controller('messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Send a message to a room' })
  async sendMessage(@User() user: JwtPayloadDto, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(user.id, dto);
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get message history for a room' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMessages(
    @Param('roomId') roomId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const rawPage = parseInt(page ?? '', 10);
    const rawLimit = parseInt(limit ?? '', 10);
    const parsedPage = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);
    const parsedLimit = Math.min(
      100,
      Math.max(1, Number.isNaN(rawLimit) ? 50 : rawLimit),
    );
    return this.chatService.getMessages(roomId, parsedPage, parsedLimit);
  }
}
