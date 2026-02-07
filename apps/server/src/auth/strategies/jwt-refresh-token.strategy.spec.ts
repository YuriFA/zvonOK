jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshTokenStrategy } from './jwt-refresh-token.strategy';
import { UserService } from 'src/user/user.service';
import { RefreshTokenHelper } from '../helpers/refresh-token.helper';
import type { Request } from 'express';

describe('JwtRefreshTokenStrategy', () => {
  let strategy: JwtRefreshTokenStrategy;
  let userService: jest.Mocked<UserService>;

  const baseUser = {
    id: 'user-1',
    email: 'user@example.com',
    refreshTokenHash: 'stored-hash',
    tokenVersion: 0,
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

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

  describe('Validation', () => {
    it('returns user for valid token with matching hash', async () => {
      const validToken = 'valid-refresh-token';
      const tokenHash = RefreshTokenHelper.hash(validToken);

      userService.user.mockResolvedValue({
        ...baseUser,
        refreshTokenHash: tokenHash,
      } as unknown as Awaited<ReturnType<UserService['user']>>);

      const req = {
        cookies: { refresh_token: validToken },
      } as unknown as Request;

      const result = await strategy.validate(req, {
        id: 'user-1',
        email: 'user@example.com',
        jti: 'some-jti',
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        tokenVersion: 0,
      });
    });

    it('throws when jti missing from payload', async () => {
      const req = {} as unknown as Request;

      await expect(
        strategy.validate(req, { id: 'user-1', email: 'user@example.com' }),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('throws when user not found', async () => {
      userService.user.mockResolvedValue(null);

      const req = {
        cookies: { refresh_token: 'some-token' },
      } as unknown as Request;

      await expect(
        strategy.validate(req, {
          id: 'user-1',
          email: 'user@example.com',
          jti: 'some-jti',
        }),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('throws when refreshTokenHash is null', async () => {
      userService.user.mockResolvedValue({
        ...baseUser,
        refreshTokenHash: null,
      } as unknown as Awaited<ReturnType<UserService['user']>>);

      const req = {
        cookies: { refresh_token: 'some-token' },
      } as unknown as Request;

      await expect(
        strategy.validate(req, {
          id: 'user-1',
          email: 'user@example.com',
          jti: 'some-jti',
        }),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('throws on token version mismatch', async () => {
      const validToken = 'valid-refresh-token';
      const tokenHash = RefreshTokenHelper.hash(validToken);

      userService.user.mockResolvedValue({
        ...baseUser,
        refreshTokenHash: tokenHash,
        tokenVersion: 5, // Different from payload
      } as unknown as Awaited<ReturnType<UserService['user']>>);

      const req = {
        cookies: { refresh_token: validToken },
      } as unknown as Request;

      await expect(
        strategy.validate(req, {
          id: 'user-1',
          email: 'user@example.com',
          jti: 'some-jti',
          tokenVersion: 0, // Mismatch
        }),
      ).rejects.toThrow('Token has been revoked');
    });

    it('cookie extraction works as fallback', async () => {
      const validToken = 'valid-refresh-token';
      const tokenHash = RefreshTokenHelper.hash(validToken);

      userService.user.mockResolvedValue({
        ...baseUser,
        refreshTokenHash: tokenHash,
      } as unknown as Awaited<ReturnType<UserService['user']>>);

      const req = {
        cookies: { refresh_token: validToken },
        headers: {},
      } as unknown as Request;

      const result = await strategy.validate(req, {
        id: 'user-1',
        email: 'user@example.com',
        jti: 'some-jti',
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        tokenVersion: 0,
      });
    });

    it('Bearer token extraction works when cookie is not set', async () => {
      const bearerToken = 'bearer-token';
      const bearerHash = RefreshTokenHelper.hash(bearerToken);

      userService.user.mockResolvedValue({
        ...baseUser,
        refreshTokenHash: bearerHash,
      } as unknown as Awaited<ReturnType<UserService['user']>>);

      const req = {
        cookies: {}, // No cookie
        headers: {
          authorization: `Bearer ${bearerToken}`,
        },
      } as unknown as Request;

      const result = await strategy.validate(req, {
        id: 'user-1',
        email: 'user@example.com',
        jti: 'some-jti',
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        tokenVersion: 0,
      });
    });

    it('cookie extraction takes priority when both are present', async () => {
      const cookieToken = 'cookie-token';
      const bearerToken = 'bearer-token';
      const cookieHash = RefreshTokenHelper.hash(cookieToken);

      userService.user.mockResolvedValue({
        ...baseUser,
        refreshTokenHash: cookieHash,
      } as unknown as Awaited<ReturnType<UserService['user']>>);

      const req = {
        cookies: { refresh_token: cookieToken },
        headers: {
          authorization: `Bearer ${bearerToken}`,
        },
      } as unknown as Request;

      const result = await strategy.validate(req, {
        id: 'user-1',
        email: 'user@example.com',
        jti: 'some-jti',
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        tokenVersion: 0,
      });
    });

    it('throws when no refresh token provided', async () => {
      userService.user.mockResolvedValue(baseUser as unknown as Awaited<ReturnType<UserService['user']>>);

      const req = {
        cookies: {},
        headers: {},
      } as unknown as Request;

      await expect(
        strategy.validate(req, {
          id: 'user-1',
          email: 'user@example.com',
          jti: 'some-jti',
        }),
      ).rejects.toThrow('No refresh token provided');
    });
  });

  describe('Token Reuse Detection', () => {
    let compareSpy: jest.SpyInstance;

    afterEach(() => {
      if (compareSpy) {
        compareSpy.mockRestore();
      }
    });

    it('clears refresh hash on token reuse', async () => {
      const staleToken = 'stale-token';
      const currentHash = 'current-hash';

      userService.user.mockResolvedValue({
        ...baseUser,
        refreshTokenHash: currentHash,
      } as unknown as Awaited<ReturnType<UserService['user']>>);

      compareSpy = jest.spyOn(RefreshTokenHelper, 'compare').mockReturnValue(false);

      const req = {
        cookies: { refresh_token: staleToken },
      } as unknown as Request;

      await expect(
        strategy.validate(req, {
          id: 'user-1',
          email: 'user@example.com',
          jti: 'some-jti',
        }),
      ).rejects.toThrow(UnauthorizedException);

      const thrownError = await strategy
        .validate(req, {
          id: 'user-1',
          email: 'user@example.com',
          jti: 'some-jti',
        })
        .catch((e) => e);

      expect(thrownError).toBeInstanceOf(UnauthorizedException);
      expect(thrownError.getResponse()).toMatchObject({
        message: 'Refresh token reuse detected',
        code: 'REFRESH_REUSE_DETECTED',
      });

      expect(userService.updateRefreshTokenHash).toHaveBeenCalledWith('user-1', null);
    });
  });

  describe('Token Version Validation', () => {
    it('allows when tokenVersion matches', async () => {
      const validToken = 'valid-refresh-token';
      const tokenHash = RefreshTokenHelper.hash(validToken);

      userService.user.mockResolvedValue({
        ...baseUser,
        refreshTokenHash: tokenHash,
        tokenVersion: 3,
      } as unknown as Awaited<ReturnType<UserService['user']>>);

      const req = {
        cookies: { refresh_token: validToken },
      } as unknown as Request;

      const result = await strategy.validate(req, {
        id: 'user-1',
        email: 'user@example.com',
        jti: 'some-jti',
        tokenVersion: 3,
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        tokenVersion: 3,
      });
    });

    it('skips validation when tokenVersion is undefined in payload', async () => {
      const validToken = 'valid-refresh-token';
      const tokenHash = RefreshTokenHelper.hash(validToken);

      userService.user.mockResolvedValue({
        ...baseUser,
        refreshTokenHash: tokenHash,
        tokenVersion: 5,
      } as unknown as Awaited<ReturnType<UserService['user']>>);

      const req = {
        cookies: { refresh_token: validToken },
      } as unknown as Request;

      const result = await strategy.validate(req, {
        id: 'user-1',
        email: 'user@example.com',
        jti: 'some-jti',
        // tokenVersion undefined
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        tokenVersion: 5,
      });
    });
  });
});
