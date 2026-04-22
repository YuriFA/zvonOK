import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { GuestService } from '../guest.service';

interface UserJwtPayload {
  id: string;
  email: string;
  role: string;
}

export interface RoomIdentity {
  id: string;
  isGuest: boolean;
}

/**
 * Accepts either a registered-user JWT (access_token cookie / Bearer header)
 * or a guest JWT (zvonok_guest_<slug> cookie).
 *
 * Sets req.user as RoomIdentity so the controller can read it regardless of
 * identity type.
 *
 * Apply with @SkipAuthGuard() + @UseGuards(FlexibleRoomAuthGuard) on routes
 * that need to be accessible by both users and guests.
 */
@Injectable()
export class FlexibleRoomAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly guestService: GuestService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    // 1. Try registered-user JWT (access_token cookie or Bearer header)
    const userToken = this.extractUserToken(req);
    if (userToken) {
      try {
        const payload = this.jwtService.verify<UserJwtPayload>(userToken);
        (req as Request & { user: RoomIdentity }).user = {
          id: payload.id,
          isGuest: false,
        };
        return true;
      } catch {
        // token invalid — fall through to guest check
      }
    }

    // 2. Try guest JWT (zvonok_guest_<slug> cookie)
    const slug = (req.params as Record<string, string>)?.slug;
    if (slug) {
      const guestToken = this.extractGuestToken(req, slug);
      if (guestToken) {
        const guest = this.guestService.validateGuestToken(guestToken, slug);
        if (guest) {
          (req as Request & { user: RoomIdentity }).user = {
            id: guest.guestId,
            isGuest: true,
          };
          return true;
        }
      }
    }

    throw new UnauthorizedException();
  }

  private extractUserToken(req: Request): string | null {
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.access_token ?? null;
  }

  private extractGuestToken(req: Request, slug: string): string | null {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[`zvonok_guest_${slug}`] ?? null;
  }
}
