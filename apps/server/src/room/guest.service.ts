import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { SfuGateway } from '../sfu/sfu.gateway';

interface GuestJoinRequest {
  requestId: string;
  roomSlug: string;
  displayName: string;
  ownerSocketId: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'denied';
  token?: string;
}

const REQUEST_TTL_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

@Injectable()
export class GuestService implements OnModuleDestroy {
  private readonly logger = new Logger(GuestService.name);
  private readonly pending = new Map<string, GuestJoinRequest>();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly sfuGateway: SfuGateway,
  ) {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  createRequest(
    roomSlug: string,
    displayName: string,
  ): {
    requestId: string;
  } {
    const ownerSocketId = this.sfuGateway.getOwnerSocketId(roomSlug);
    if (!ownerSocketId) {
      return { requestId: '' };
    }

    const requestId = randomUUID();
    const request: GuestJoinRequest = {
      requestId,
      roomSlug,
      displayName,
      ownerSocketId,
      createdAt: Date.now(),
      status: 'pending',
    };
    this.pending.set(requestId, request);

    this.sfuGateway.emitToSocket(ownerSocketId, 'sfu:guest-join-request', {
      requestId,
      displayName,
    });

    this.logger.log(
      `Guest join request created: ${requestId} (${displayName}) for room ${roomSlug}`,
    );
    return { requestId };
  }

  hasOwnerOnline(roomSlug: string): boolean {
    return this.sfuGateway.getOwnerSocketId(roomSlug) !== null;
  }

  approveRequest(requestId: string, roomSlug: string): string | null {
    const request = this.pending.get(requestId);
    if (!request) return null;
    if (request.roomSlug !== roomSlug) return null;

    const token = this.jwtService.sign(
      {
        guestId: randomUUID(),
        roomSlug,
        displayName: request.displayName,
        scope: 'room',
      },
      {
        secret: this.config.get<string>('JWT_GUEST_SECRET'),
        expiresIn: '2h',
      },
    );

    request.status = 'approved';
    request.token = token;

    this.sfuGateway.emitToSocket(
      request.ownerSocketId,
      'sfu:guest-join-approved',
      { token },
    );

    this.logger.log(`Guest join request approved: ${requestId}`);
    return token;
  }

  denyRequest(requestId: string, roomSlug: string): boolean {
    const request = this.pending.get(requestId);
    if (!request) return false;
    if (request.roomSlug !== roomSlug) return false;

    request.status = 'denied';
    this.sfuGateway.emitToSocket(
      request.ownerSocketId,
      'sfu:guest-join-denied',
      {},
    );
    this.logger.log(`Guest join request denied: ${requestId}`);
    return true;
  }

  getRequestStatus(requestId: string): {
    status: 'pending' | 'approved' | 'denied';
    token?: string;
  } | null {
    const request = this.pending.get(requestId);
    if (!request) return null;
    return { status: request.status, token: request.token };
  }

  validateGuestToken(
    token: string,
    roomSlug: string,
  ): { guestId: string; displayName: string } | null {
    try {
      const payload = this.jwtService.verify<{
        guestId: string;
        displayName: string;
        roomSlug: string;
        scope: string;
      }>(token, {
        secret: this.config.get<string>('JWT_GUEST_SECRET'),
      });
      if (payload.scope !== 'room' || payload.roomSlug !== roomSlug) return null;
      return { guestId: payload.guestId, displayName: payload.displayName };
    } catch {
      return null;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, request] of this.pending) {
      if (now - request.createdAt > REQUEST_TTL_MS) {
        this.pending.delete(id);
        this.logger.log(`Expired guest request: ${id}`);
      }
    }
  }
}
