jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PasswordHelper } from './helpers/password.helper';
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

    jest
      .spyOn(PasswordHelper, 'hash')
      .mockResolvedValueOnce('hashed-password')
      .mockResolvedValueOnce('hashed-refresh');

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
    jest.spyOn(PasswordHelper, 'hash').mockResolvedValue('hashed-refresh');

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
    jest.spyOn(PasswordHelper, 'hash').mockResolvedValue('hashed-refresh');

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
});
