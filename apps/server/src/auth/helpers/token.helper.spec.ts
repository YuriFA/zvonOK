import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenHelper } from './token.helper';
import { randomUUID } from 'node:crypto';

// Mock randomUUID to get predictable jti
jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => 'mocked-uuid'),
}));

describe('TokenHelper', () => {
  let tokenHelper: TokenHelper;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenHelper,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string | number> = {
                JWT_ACCESS_SECRET: 'test-access-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_ACCESS_EXPIRES_IN_MINUTES: 15,
                JWT_REFRESH_EXPIRES_IN_DAYS: 7,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    tokenHelper = module.get<TokenHelper>(TokenHelper);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  describe('generateAccessToken', () => {
    it('creates JWT with correct payload and options', () => {
      const payload = { id: 'user-1', email: 'user@example.com', tokenVersion: 0 };
      jwtService.sign.mockReturnValue('access-token');

      const result = tokenHelper.generateAccessToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(payload, {
        expiresIn: '15m',
        secret: 'test-access-secret',
      });
      expect(result).toBe('access-token');
    });

    it('uses correct expiration from config', () => {
      const payload = { id: 'user-1', email: 'user@example.com' };
      jwtService.sign.mockReturnValue('access-token');

      tokenHelper.generateAccessToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({
          expiresIn: '15m',
        }),
      );
    });

    it('uses correct secret from config', () => {
      const payload = { id: 'user-1', email: 'user@example.com' };
      jwtService.sign.mockReturnValue('access-token');

      tokenHelper.generateAccessToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({
          secret: 'test-access-secret',
        }),
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('creates JWT with jti (JWT ID)', () => {
      const payload = { id: 'user-1', email: 'user@example.com', tokenVersion: 0 };
      jwtService.sign.mockReturnValue('refresh-token');

      const result = tokenHelper.generateRefreshToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(payload, {
        expiresIn: '7d',
        secret: 'test-refresh-secret',
        jwtid: 'mocked-uuid',
      });
      expect(result).toBe('refresh-token');
    });

    it('generates unique jti for each token', () => {
      const payload = { id: 'user-1', email: 'user@example.com' };
      jwtService.sign.mockReturnValue('refresh-token');

      // Clear previous calls before this test
      (randomUUID as jest.Mock).mockClear();

      tokenHelper.generateRefreshToken(payload);
      tokenHelper.generateRefreshToken(payload);

      // Each generateRefreshToken calls jwtService.sign, which uses randomUUID
      // We expect 2 calls to randomUUID for the 2 refresh tokens
      expect(randomUUID).toHaveBeenCalledTimes(2);
    });

    it('uses correct expiration from config', () => {
      const payload = { id: 'user-1', email: 'user@example.com' };
      jwtService.sign.mockReturnValue('refresh-token');

      tokenHelper.generateRefreshToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({
          expiresIn: '7d',
        }),
      );
    });

    it('uses correct secret from config', () => {
      const payload = { id: 'user-1', email: 'user@example.com' };
      jwtService.sign.mockReturnValue('refresh-token');

      tokenHelper.generateRefreshToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({
          secret: 'test-refresh-secret',
        }),
      );
    });
  });

  describe('integration', () => {
    it('uses different secrets for access and refresh tokens', () => {
      const payload = { id: 'user-1', email: 'user@example.com' };
      jwtService.sign.mockReturnValue('token');

      tokenHelper.generateAccessToken(payload);
      tokenHelper.generateRefreshToken(payload);

      const accessCall = jwtService.sign.mock.calls[0];
      const refreshCall = jwtService.sign.mock.calls[1];

      expect(accessCall?.[1]?.secret).toBe('test-access-secret');
      expect(refreshCall?.[1]?.secret).toBe('test-refresh-secret');
      expect(accessCall?.[1]?.secret).not.toBe(refreshCall?.[1]?.secret);
    });

    it('includes tokenVersion in payload when provided', () => {
      const payload = { id: 'user-1', email: 'user@example.com', tokenVersion: 5 };
      jwtService.sign.mockReturnValue('token');

      tokenHelper.generateAccessToken(payload);
      tokenHelper.generateRefreshToken(payload);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { id: 'user-1', email: 'user@example.com', tokenVersion: 5 },
        expect.any(Object),
      );
    });
  });
});
