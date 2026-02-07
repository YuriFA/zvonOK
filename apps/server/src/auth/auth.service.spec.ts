jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenHelper } from './helpers/token.helper';
import { PasswordHelper } from './helpers/password.helper';
import { RefreshTokenHelper } from './helpers/refresh-token.helper';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const baseUser = {
    id: 'user-1',
    email: 'john@example.com',
    username: 'john',
    passwordHash: 'hashed-password',
    refreshTokenHash: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    failedLoginAttempts: 0,
    lockedUntil: null,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    jest.restoreAllMocks();

    const configValues: Record<string, string | number> = {
      JWT_ACCESS_SECRET: 'access-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_ACCESS_EXPIRES_IN_MINUTES: 15,
      JWT_REFRESH_EXPIRES_IN_DAYS: 7,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            user: jest.fn(),
            createUser: jest.fn(),
            updateRefreshTokenHash: jest.fn(),
            updateUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn((payload: unknown, options: { secret: string }) => {
              if (options.secret === 'access-secret') {
                return 'access-token';
              }

              if (options.secret === 'refresh-secret') {
                return 'refresh-token';
              }

              return 'unknown-token';
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configValues[key]),
          },
        },
        TokenHelper,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registerUser throws when user exists', async () => {
    userService.user.mockResolvedValue(baseUser);

    await expect(
      service.registerUser({
        email: 'john@example.com',
        username: 'john',
        password: 'Password123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('registerUser creates user and issues tokens', async () => {
    userService.user.mockResolvedValue(null);
    userService.createUser.mockResolvedValue(baseUser);

    jest.spyOn(PasswordHelper, 'hash').mockResolvedValueOnce('hashed-password');
    jest.spyOn(RefreshTokenHelper, 'hash').mockReturnValueOnce('hashed-refresh');

    const tokens = await service.registerUser({
      email: 'john@example.com',
      username: 'john',
      password: 'Password123',
    });

    expect(userService.createUser).toHaveBeenCalledWith({
      email: 'john@example.com',
      username: 'john',
      passwordHash: 'hashed-password',
    });

    expect(userService.updateRefreshTokenHash).toHaveBeenCalledWith(
      baseUser.id,
      'hashed-refresh',
    );
    expect(tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('loginUser throws when user is not found', async () => {
    userService.user.mockResolvedValue(null);

    await expect(
      service.loginUser({
        email: 'john@example.com',
        password: 'Password123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('loginUser throws when password is invalid', async () => {
    userService.user.mockResolvedValue(baseUser);
    jest.spyOn(PasswordHelper, 'compare').mockResolvedValue(false);

    await expect(
      service.loginUser({
        email: 'john@example.com',
        password: 'wrong',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('loginUser issues tokens for valid credentials', async () => {
    userService.user.mockResolvedValue(baseUser);
    jest.spyOn(PasswordHelper, 'compare').mockResolvedValue(true);
    jest.spyOn(RefreshTokenHelper, 'hash').mockReturnValueOnce('hashed-refresh');

    const tokens = await service.loginUser({
      email: 'john@example.com',
      password: 'Password123',
    });

    expect(userService.updateRefreshTokenHash).toHaveBeenCalledWith(
      baseUser.id,
      'hashed-refresh',
    );
    expect(tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(jwtService.sign).toHaveBeenCalled();
    expect(configService.get).toHaveBeenCalled();
  });

  it('logout clears refresh token hash', async () => {
    await service.logout({ id: baseUser.id, email: baseUser.email });

    expect(userService.updateRefreshTokenHash).toHaveBeenCalledWith(
      baseUser.id,
      null,
    );
  });

  it('refreshToken returns new access token', async () => {
    userService.user.mockResolvedValue(baseUser);
    jest.spyOn(RefreshTokenHelper, 'hash').mockReturnValueOnce('hashed-refresh');

    const result = await service.refreshToken({
      id: baseUser.id,
      email: baseUser.email,
    });

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(userService.updateRefreshTokenHash).toHaveBeenCalledWith(
      baseUser.id,
      'hashed-refresh',
    );
  });

  describe('Account Lockout', () => {
    it('locks account after 5 failed attempts', async () => {
      const userWithAttempts = { ...baseUser, failedLoginAttempts: 4 };
      userService.user.mockResolvedValue(userWithAttempts);
      jest.spyOn(PasswordHelper, 'compare').mockResolvedValue(false);
      userService.updateUser.mockResolvedValue({ ...userWithAttempts, failedLoginAttempts: 5 });

      await expect(
        service.loginUser({
          email: 'john@example.com',
          password: 'wrong',
        }),
      ).rejects.toThrow('Too many failed login attempts');

      expect(userService.updateUser).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      });
    });

    it('returns lock time remaining when account is locked', async () => {
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      const lockedUser = { ...baseUser, lockedUntil };

      userService.user.mockResolvedValue(lockedUser);
      jest.spyOn(PasswordHelper, 'compare').mockResolvedValue(false);

      await expect(
        service.loginUser({
          email: 'john@example.com',
          password: 'wrong',
        }),
      ).rejects.toThrow(/Account is locked/);
    });

    it('resets failed attempts after lockout period expires', async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const lockedUser = { ...baseUser, lockedUntil: pastDate, failedLoginAttempts: 5 };

      userService.user.mockResolvedValue(lockedUser);
      jest.spyOn(PasswordHelper, 'compare').mockResolvedValue(true);
      jest.spyOn(RefreshTokenHelper, 'hash').mockReturnValueOnce('hashed-refresh');
      userService.updateUser.mockResolvedValue(baseUser);

      await service.loginUser({
        email: 'john@example.com',
        password: 'correct',
      });

      expect(userService.updateUser).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    it('resets failed attempts on successful login', async () => {
      const userWithAttempts = { ...baseUser, failedLoginAttempts: 3 };
      userService.user.mockResolvedValue(userWithAttempts);
      jest.spyOn(PasswordHelper, 'compare').mockResolvedValue(true);
      jest.spyOn(RefreshTokenHelper, 'hash').mockReturnValueOnce('hashed-refresh');
      userService.updateUser.mockResolvedValue(baseUser);

      await service.loginUser({
        email: 'john@example.com',
        password: 'correct',
      });

      expect(userService.updateUser).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    it('increments failed attempts on wrong password', async () => {
      userService.user.mockResolvedValue(baseUser);
      jest.spyOn(PasswordHelper, 'compare').mockResolvedValue(false);
      userService.updateUser.mockResolvedValue(baseUser);

      await expect(
        service.loginUser({
          email: 'john@example.com',
          password: 'wrong',
        }),
      ).rejects.toThrow('Invalid credentials');

      expect(userService.updateUser).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: { failedLoginAttempts: 1 },
      });
    });
  });

  describe('Token Version', () => {
    it('refreshToken includes current tokenVersion in new tokens', async () => {
      const userWithVersion = { ...baseUser, tokenVersion: 5 };
      userService.user.mockResolvedValue(userWithVersion);
      jest.spyOn(RefreshTokenHelper, 'hash').mockReturnValueOnce('hashed-refresh');

      const result = await service.refreshToken({
        id: baseUser.id,
        email: baseUser.email,
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ tokenVersion: 5 }),
        expect.any(Object),
      );
    });

    it('loginUser includes user tokenVersion in tokens', async () => {
      const userWithVersion = { ...baseUser, tokenVersion: 3 };
      userService.user.mockResolvedValue(userWithVersion);
      jest.spyOn(PasswordHelper, 'compare').mockResolvedValue(true);
      jest.spyOn(RefreshTokenHelper, 'hash').mockReturnValueOnce('hashed-refresh');

      await service.loginUser({
        email: 'john@example.com',
        password: 'correct',
      });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ tokenVersion: 3 }),
        expect.any(Object),
      );
    });
  });

  describe('Edge Cases', () => {
    it('loginUser throws generic message when email not found', async () => {
      userService.user.mockResolvedValue(null);

      await expect(
        service.loginUser({
          email: 'nonexistent@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('refreshToken throws when user not found', async () => {
      userService.user.mockResolvedValue(null);

      await expect(
        service.refreshToken({
          id: 'nonexistent-user',
          email: 'nonexistent@example.com',
        }),
      ).rejects.toThrow('Invalid user');
    });

    it('handles user with null tokenVersion', async () => {
      const userWithoutVersion = { ...baseUser, tokenVersion: null as unknown as number };
      userService.user.mockResolvedValue(userWithoutVersion);
      jest.spyOn(RefreshTokenHelper, 'hash').mockReturnValueOnce('hashed-refresh');

      const result = await service.refreshToken({
        id: baseUser.id,
        email: baseUser.email,
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('handles user with undefined tokenVersion', async () => {
      const userWithoutVersion = { ...baseUser, tokenVersion: undefined as unknown as number };
      userService.user.mockResolvedValue(userWithoutVersion);
      jest.spyOn(PasswordHelper, 'compare').mockResolvedValue(true);
      jest.spyOn(RefreshTokenHelper, 'hash').mockReturnValueOnce('hashed-refresh');

      const result = await service.loginUser({
        email: 'john@example.com',
        password: 'correct',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });
});
