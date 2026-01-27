jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            refreshToken: jest.fn(),
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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('refreshToken sets access and refresh cookies', async () => {
    const authService = module.get<AuthService>(AuthService);
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
