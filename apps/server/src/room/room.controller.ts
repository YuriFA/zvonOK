import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipAuthGuard } from '../auth/skip-auth.guard';
import { User } from '../user/decorators/user.decorator';
import { JwtPayloadDto } from '../auth/dto/jwt-payload.dto';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@ApiTags('rooms')
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new room' })
  async createRoom(@User() user: JwtPayloadDto, @Body() dto: CreateRoomDto) {
    return this.roomService.createRoom(user.id, dto);
  }

  @Get(':slug')
  @SkipAuthGuard()
  @ApiOperation({ summary: 'Get room by slug' })
  async getRoomBySlug(@Param('slug') slug: string) {
    return this.roomService.findBySlug(slug);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update room (owner only)' })
  async updateRoom(
    @User() user: JwtPayloadDto,
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    const room = await this.roomService.findById(id);
    if (room.ownerId !== user.id) {
      throw new ForbiddenException('Only the owner can update this room');
    }
    return this.roomService.updateRoom(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End room (owner only)' })
  async deleteRoom(@User() user: JwtPayloadDto, @Param('id') id: string) {
    const room = await this.roomService.findById(id);
    if (room.ownerId !== user.id) {
      throw new ForbiddenException('Only the owner can end this room');
    }
    await this.roomService.softDeleteRoom(id);
  }
}
