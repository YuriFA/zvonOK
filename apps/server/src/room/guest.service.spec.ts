import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GuestService } from './guest.service';
import { SfuGateway } from '../sfu/sfu.gateway';

describe('GuestService', () => {
  let service: GuestService;
  let jwtService: jest.Mocked<JwtService>;
  let sfuGateway: jest.Mocked<SfuGateway>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('guest.jwt.token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('guest-secret') },
        },
        {
          provide: SfuGateway,
          useValue: {
            getOwnerSocketId: jest.fn().mockReturnValue('owner-socket-1'),
            emitToSocket: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(GuestService);
    jwtService = module.get(JwtService);
    sfuGateway = module.get(SfuGateway);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('hasOwnerOnline', () => {
    it('returns true when owner socket exists', () => {
      (sfuGateway.getOwnerSocketId as jest.Mock).mockReturnValue('socket-1');
      expect(service.hasOwnerOnline('abc123')).toBe(true);
    });

    it('returns false when owner socket does not exist', () => {
      (sfuGateway.getOwnerSocketId as jest.Mock).mockReturnValue(null);
      expect(service.hasOwnerOnline('abc123')).toBe(false);
    });
  });

  describe('createRequest', () => {
    it('creates a request and emits to owner socket', () => {
      const result = service.createRequest('abc123', 'John');
      expect(result.requestId).toBeTruthy();
      expect(sfuGateway.emitToSocket).toHaveBeenCalledWith(
        'owner-socket-1',
        'sfu:guest-join-request',
        expect.objectContaining({ displayName: 'John' }),
      );
    });
  });

  describe('approveRequest', () => {
    it('returns null for unknown requestId', () => {
      expect(service.approveRequest('nonexistent', 'abc123')).toBeNull();
    });

    it('approves a pending request and returns a token', () => {
      const { requestId } = service.createRequest('abc123', 'John');
      const token = service.approveRequest(requestId, 'abc123');
      expect(token).toBe('guest.jwt.token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          roomSlug: 'abc123',
          displayName: 'John',
          scope: 'room',
        }),
        expect.objectContaining({ expiresIn: '2h' }),
      );
    });

    it('returns null if roomSlug does not match', () => {
      const { requestId } = service.createRequest('abc123', 'John');
      expect(service.approveRequest(requestId, 'wrong-slug')).toBeNull();
    });
  });

  describe('denyRequest', () => {
    it('returns false for unknown requestId', () => {
      expect(service.denyRequest('nonexistent', 'abc123')).toBe(false);
    });

    it('denies a pending request', () => {
      const { requestId } = service.createRequest('abc123', 'John');
      expect(service.denyRequest(requestId, 'abc123')).toBe(true);
      expect(sfuGateway.emitToSocket).toHaveBeenCalledWith(
        'owner-socket-1',
        'sfu:guest-join-denied',
        {},
      );
    });

    it('returns false if roomSlug does not match', () => {
      const { requestId } = service.createRequest('abc123', 'John');
      expect(service.denyRequest(requestId, 'wrong-slug')).toBe(false);
    });
  });

  describe('getRequestStatus', () => {
    it('returns null for unknown requestId', () => {
      expect(service.getRequestStatus('nonexistent')).toBeNull();
    });

    it('returns pending status for a new request', () => {
      const { requestId } = service.createRequest('abc123', 'John');
      expect(service.getRequestStatus(requestId)).toEqual({
        status: 'pending',
      });
    });
  });

  describe('validateGuestToken', () => {
    const validPayload = {
      guestId: 'guest-uuid',
      displayName: 'John',
      roomSlug: 'abc123',
      scope: 'room',
    };

    it('returns guest info for a valid token with matching slug', () => {
      (jwtService.verify as jest.Mock).mockReturnValue(validPayload);
      expect(service.validateGuestToken('valid.token', 'abc123')).toEqual({
        guestId: 'guest-uuid',
        displayName: 'John',
      });
    });

    it('returns null when roomSlug does not match', () => {
      (jwtService.verify as jest.Mock).mockReturnValue(validPayload);
      expect(
        service.validateGuestToken('valid.token', 'other-room'),
      ).toBeNull();
    });

    it('returns null when scope is not "room"', () => {
      (jwtService.verify as jest.Mock).mockReturnValue({
        ...validPayload,
        scope: 'other',
      });
      expect(service.validateGuestToken('valid.token', 'abc123')).toBeNull();
    });

    it('returns null when token verification throws (expired or invalid)', () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });
      expect(service.validateGuestToken('expired.token', 'abc123')).toBeNull();
    });
  });
});
