jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from 'src/generated/prisma/enums';
import type { Request } from 'express';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  const baseUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hash',
    refreshTokenHash: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    failedLoginAttempts: 0,
    lockedUntil: null,
    tokenVersion: 0,
    role: Role.USER,
  };

  const adminUser = {
    ...baseUser,
    id: 'admin-1',
    email: 'admin@example.com',
    username: 'admin',
    role: Role.ADMIN,
  };

  const makeReq = (userId: string, role: Role = Role.ADMIN) =>
    ({
      user: { id: userId, email: 'admin@example.com', role },
    }) as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            user: jest.fn(),
            updateUser: jest.fn(),
            countUsers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  describe('updateUserRole', () => {
    it('returns updated user without sensitive fields', async () => {
      userService.user.mockResolvedValue(baseUser);
      userService.updateUser.mockResolvedValue({
        ...baseUser,
        role: Role.HOST,
        tokenVersion: 1,
      });

      const result = await controller.updateUserRole(
        'user-1',
        { role: Role.HOST },
        makeReq('admin-1'),
      );

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshTokenHash');
      expect(result.role).toBe(Role.HOST);
      expect(result.id).toBe('user-1');
    });

    it('throws NotFoundException when user does not exist', async () => {
      userService.user.mockResolvedValue(null);

      await expect(
        controller.updateUserRole(
          'nonexistent-id',
          { role: Role.HOST },
          makeReq('admin-1'),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it('calls updateUser with correct params including tokenVersion increment', async () => {
      userService.user.mockResolvedValue(baseUser);
      userService.updateUser.mockResolvedValue({
        ...baseUser,
        role: Role.ADMIN,
        tokenVersion: 1,
      });

      await controller.updateUserRole(
        'user-1',
        { role: Role.ADMIN },
        makeReq('admin-1'),
      );

      expect(userService.updateUser).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: Role.ADMIN, tokenVersion: { increment: 1 } },
      });
    });

    it('throws ForbiddenException when admin tries to change their own role', async () => {
      await expect(
        controller.updateUserRole(
          'admin-1',
          { role: Role.USER },
          makeReq('admin-1'),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(userService.user).not.toHaveBeenCalled();
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when demoting the last admin', async () => {
      userService.user.mockResolvedValue(adminUser);
      userService.countUsers.mockResolvedValue(1);

      await expect(
        controller.updateUserRole(
          'admin-1',
          { role: Role.USER },
          makeReq('admin-2'),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it('allows demoting an admin when there are multiple admins', async () => {
      userService.user.mockResolvedValue(adminUser);
      userService.countUsers.mockResolvedValue(2);
      userService.updateUser.mockResolvedValue({
        ...adminUser,
        role: Role.USER,
        tokenVersion: 1,
      });

      const result = await controller.updateUserRole(
        'admin-1',
        { role: Role.USER },
        makeReq('admin-2'),
      );

      expect(result.role).toBe(Role.USER);
      expect(userService.updateUser).toHaveBeenCalled();
    });
  });
});
