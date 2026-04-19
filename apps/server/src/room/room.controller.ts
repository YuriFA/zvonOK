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
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipAuthGuard } from '../auth/skip-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../user/decorators/user.decorator';
import { JwtPayloadDto } from '../auth/dto/jwt-payload.dto';
import { RoomService } from './room.service';
import { GuestService } from './guest.service';
import { SfuService } from '../sfu/sfu.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { GuestRequestDto, GuestActionDto } from './dto/guest.dto';
import { Role } from '../generated/prisma/enums';

@ApiTags('rooms')
@Controller('rooms')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly sfuService: SfuService,
    private readonly guestService: GuestService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.HOST, Role.ADMIN)
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
    await this.sfuService.endRoom(id);
  }

  @Post(':slug/guest-request')
  @SkipAuthGuard()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Guest requests to join a room' })
  async guestRequest(
    @Param('slug') slug: string,
    @Body() dto: GuestRequestDto,
  ) {
    const room = await this.roomService.findBySlug(slug);
    if (room.status !== 'active') {
      throw new BadRequestException('Room is not active');
    }
    if (!this.guestService.hasOwnerOnline(slug)) {
      throw new BadRequestException('Room owner is not online');
    }
    return this.guestService.createRequest(slug, dto.displayName);
  }

  @Post(':slug/guest-approve')
  @ApiOperation({ summary: 'Owner approves guest join request' })
  async guestApprove(
    @User() user: JwtPayloadDto,
    @Param('slug') slug: string,
    @Body() dto: GuestActionDto,
  ) {
    const room = await this.roomService.findBySlug(slug);
    if (room.ownerId !== user.id) {
      throw new ForbiddenException('Only the owner can approve guests');
    }
    const token = this.guestService.approveRequest(dto.requestId, slug);
    if (!token) {
      throw new NotFoundException('Request not found or expired');
    }
    return { token };
  }

  @Post(':slug/guest-deny')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Owner denies guest join request' })
  async guestDeny(
    @User() user: JwtPayloadDto,
    @Param('slug') slug: string,
    @Body() dto: GuestActionDto,
  ) {
    const room = await this.roomService.findBySlug(slug);
    if (room.ownerId !== user.id) {
      throw new ForbiddenException('Only the owner can deny guests');
    }
    const denied = this.guestService.denyRequest(dto.requestId, slug);
    if (!denied) {
      throw new NotFoundException('Request not found or expired');
    }
  }

  @Get(':slug/guest-status/:requestId')
  @SkipAuthGuard()
  @ApiOperation({ summary: 'Guest checks join request status' })
  async guestStatus(
    @Param('slug') _slug: string,
    @Param('requestId') requestId: string,
  ) {
    const result = this.guestService.getRequestStatus(requestId);
    if (!result) {
      throw new NotFoundException('Request not found or expired');
    }
    return result;
  }
}
