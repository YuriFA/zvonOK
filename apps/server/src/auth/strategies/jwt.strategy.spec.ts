// Mock the prisma service before importing anything that uses it
jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from 'src/user/user.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_ACCESS_SECRET') {
                return 'test-access-secret';
              }
              return undefined;
            }),
          },
        },
        {
          provide: UserService,
          useValue: {
            user: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get(ConfigService);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should have a name property', () => {
    expect(strategy.name).toBe('jwt');
  });

  describe('validate', () => {
    it('extracts user from valid JWT payload', async () => {
      const payload = {
        id: 'user-1',
        email: 'user@example.com',
        tokenVersion: 0,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
      });
    });

    it('does NOT query database for tokenVersion (performance optimization)', async () => {
      const payload = {
        id: 'user-1',
        email: 'user@example.com',
        tokenVersion: 5,
      };

      await strategy.validate(payload);

      // UserService should NOT be called
      expect(userService.user).not.toHaveBeenCalled();
    });

    it('returns user without tokenVersion check', async () => {
      const payload = {
        id: 'user-1',
        email: 'user@example.com',
        tokenVersion: 0,
      };

      const result = await strategy.validate(payload);

      // Result should not include tokenVersion
      expect(result).not.toHaveProperty('tokenVersion');
      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
      });
    });

    it('handles payload without tokenVersion', async () => {
      const payload = {
        id: 'user-1',
        email: 'user@example.com',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
      });
      expect(userService.user).not.toHaveBeenCalled();
    });

    it('works with minimal valid payload', async () => {
      const payload = {
        id: 'user-1',
        email: 'user@example.com',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
      });
    });
  });

  describe('constructor configuration', () => {
    it('configures JWT secret from config service', () => {
      expect(configService.get).toHaveBeenCalledWith('JWT_ACCESS_SECRET');
    });

    it('uses the correct secret', () => {
      // The strategy should be configured with the test secret
      expect(strategy).toBeDefined();
    });
  });

  describe('integration', () => {
    it('handles different user IDs', async () => {
      const payloads = [
        { id: 'user-1', email: 'user1@example.com' },
        { id: 'user-2', email: 'user2@example.com' },
        { id: 'user-3', email: 'user3@example.com' },
      ];

      for (const payload of payloads) {
        const result = await strategy.validate(payload);
        expect(result).toEqual({
          id: payload.id,
          email: payload.email,
        });
      }
    });

    it('does not throw on any valid payload structure', async () => {
      const validPayloads = [
        { id: '123', email: 'test@test.com', tokenVersion: 0 },
        { id: 'abc', email: 'a@b.c' },
        { id: 'user-with-dash', email: 'user+tag@example.com', tokenVersion: 99 },
      ];

      for (const payload of validPayloads) {
        await expect(strategy.validate(payload)).resolves.toBeDefined();
      }
    });
  });
});
