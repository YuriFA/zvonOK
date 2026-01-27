jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshTokenStrategy } from './jwt-refresh-token.strategy';
import { UserService } from 'src/user/user.service';
import { PasswordHelper } from '../helpers/password.helper';
import type { Request } from 'express';

describe('JwtRefreshTokenStrategy', () => {
  let strategy: JwtRefreshTokenStrategy;
  let userService: jest.Mocked<UserService>;

  beforeEach(() => {
    userService = {
      user: jest.fn(),
      updateRefreshTokenHash: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') {
          return 'refresh-secret';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    const logger = {
      warn: jest.fn(),
    } as unknown as Logger;

    strategy = new JwtRefreshTokenStrategy(configService, userService, logger);
  });

  it('clears refresh hash on token reuse', async () => {
    userService.user.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      refreshTokenHash: 'stored-hash',
    } as unknown as Awaited<ReturnType<UserService['user']>>);

    jest.spyOn(PasswordHelper, 'compare').mockResolvedValue(false);

    const req = {
      cookies: { refresh_token: 'stale-token' },
    } as unknown as Request;

    let thrown: UnauthorizedException | undefined;

    try {
      await strategy.validate(req, { id: 'user-1', email: 'user@example.com' });
    } catch (error) {
      thrown = error as UnauthorizedException;
    }

    expect(thrown).toBeInstanceOf(UnauthorizedException);
    expect(thrown?.getResponse()).toMatchObject({
      message: 'Refresh token reuse detected',
      code: 'REFRESH_REUSE_DETECTED',
    });

    expect(userService.updateRefreshTokenHash).toHaveBeenCalledWith(
      'user-1',
      null,
    );
  });
});
