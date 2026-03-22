import {
  Controller,
  Patch,
  Param,
  Body,
  Req,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserService } from './user.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from '../generated/prisma/enums';
import type { JwtPayloadDto } from '../auth/dto/jwt-payload.dto';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user role (ADMIN only)' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: Request,
  ) {
    const currentUser = req.user as JwtPayloadDto;

    // Prevent admin from changing their own role
    if (currentUser.id === id) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const user = await this.userService.user({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent demoting the last admin
    if (user.role === Role.ADMIN && dto.role !== Role.ADMIN) {
      const adminCount = await this.userService.countUsers({
        role: Role.ADMIN,
      });
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot demote the last admin');
      }
    }

    // Bump tokenVersion to invalidate existing tokens when role changes
    const updated = await this.userService.updateUser({
      where: { id },
      data: {
        role: dto.role,
        tokenVersion: { increment: 1 },
      },
    });
    const { passwordHash, refreshTokenHash, ...safeUser } = updated;
    void passwordHash;
    void refreshTokenHash;
    return safeUser;
  }
}
