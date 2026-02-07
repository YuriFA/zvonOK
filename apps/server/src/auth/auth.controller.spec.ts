jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let module: TestingModule;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            registerUser: jest.fn(),
            loginUser: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_ACCESS_EXPIRES_IN_MINUTES') {
                return 15;
              }

              if (key === 'JWT_REFRESH_EXPIRES_IN_DAYS') {
                return 7;
              }

              return undefined;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Register', () => {
    it('returns tokens and sets cookies on success', async () => {
      authService.registerUser.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const res = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.register(
        {
          email: 'new@example.com',
          username: 'newuser',
          password: 'Password123',
        },
        res,
      );

      expect(result).toEqual({
        success: true,
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      });
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('throws BadRequestException for duplicate email', async () => {
      authService.registerUser.mockRejectedValue(
        new BadRequestException('User already exists'),
      );

      const res = {
        cookie: jest.fn(),
      } as unknown as Response;

      await expect(
        controller.register(
          {
            email: 'existing@example.com',
            username: 'user',
            password: 'Password123',
          },
          res,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Login', () => {
    it('returns tokens and sets cookies on success', async () => {
      authService.loginUser.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const res = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.login(
        {
          email: 'user@example.com',
          password: 'Password123',
        },
        res,
      );

      expect(result).toEqual({
        success: true,
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      });
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('throws UnauthorizedException for invalid credentials', async () => {
      authService.loginUser.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      const res = {
        cookie: jest.fn(),
      } as unknown as Response;

      await expect(
        controller.login(
          {
            email: 'user@example.com',
            password: 'wrong',
          },
          res,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws with lock message when account locked', async () => {
      authService.loginUser.mockRejectedValue(
        new UnauthorizedException('Account is locked. Try again in 5 minutes.'),
      );

      const res = {
        cookie: jest.fn(),
      } as unknown as Response;

      await expect(
        controller.login(
          {
            email: 'locked@example.com',
            password: 'Password123',
          },
          res,
        ),
      ).rejects.toThrow('Account is locked');
    });
  });

  describe('Logout', () => {
    it('clears refresh token and cookies', async () => {
      authService.logout.mockResolvedValue(undefined);

      const res = {
        clearCookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.logout(
        { id: 'user-1', email: 'user@example.com' },
        res,
      );

      expect(result).toEqual({ success: true });
      expect(authService.logout).toHaveBeenCalledWith({
        id: 'user-1',
        email: 'user@example.com',
      });
      expect(res.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({ path: '/' }),
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ path: '/' }),
      );
    });
  });

  describe('refreshToken', () => {
    it('sets access and refresh cookies', async () => {
      authService.refreshToken.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const res = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.refreshToken(
        { id: 'user-1', email: 'user@example.com' },
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.objectContaining({ path: '/' }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({ path: '/' }),
      );
      expect(result).toEqual({ accessToken: 'access-token' });
    });
  });

  describe('Cookie Security', () => {
    it('all cookies set with httpOnly: true', async () => {
      authService.loginUser.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const cookieMock = jest.fn();
      const res = {
        cookie: cookieMock,
      } as unknown as Response;

      await controller.login(
        {
          email: 'user@example.com',
          password: 'Password123',
        },
        res,
      );

      const cookieCalls = cookieMock.mock.calls;
      cookieCalls.forEach(([, , options]) => {
        expect(options).toHaveProperty('httpOnly', true);
      });
    });

    it('all cookies set with sameSite: lax', async () => {
      authService.loginUser.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const cookieMock = jest.fn();
      const res = {
        cookie: cookieMock,
      } as unknown as Response;

      await controller.login(
        {
          email: 'user@example.com',
          password: 'Password123',
        },
        res,
      );

      const cookieCalls = cookieMock.mock.calls;
      cookieCalls.forEach(([, , options]) => {
        expect(options).toHaveProperty('sameSite', 'lax');
      });
    });

    it('all cookies set with path: /', async () => {
      authService.loginUser.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const cookieMock = jest.fn();
      const res = {
        cookie: cookieMock,
      } as unknown as Response;

      await controller.login(
        {
          email: 'user@example.com',
          password: 'Password123',
        },
        res,
      );

      const cookieCalls = cookieMock.mock.calls;
      cookieCalls.forEach(([, , options]) => {
        expect(options).toHaveProperty('path', '/');
      });
    });

    it('cookies use secure: false in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      authService.loginUser.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const cookieMock = jest.fn();
      const res = {
        cookie: cookieMock,
      } as unknown as Response;

      await controller.login(
        {
          email: 'user@example.com',
          password: 'Password123',
        },
        res,
      );

      const cookieCalls = cookieMock.mock.calls;
      cookieCalls.forEach(([, , options]) => {
        expect(options).toHaveProperty('secure', false);
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('clearCookies uses maxAge: 0', async () => {
      authService.logout.mockResolvedValue(undefined);

      const res = {
        clearCookie: jest.fn(),
      } as unknown as Response;

      await controller.logout(
        { id: 'user-1', email: 'user@example.com' },
        res,
      );

      expect(res.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({ maxAge: 0 }),
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ maxAge: 0 }),
      );
    });
  });
});
