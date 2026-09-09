import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';

interface GuestTokenClaims {
  guestId: string;
  displayName: string;
  roomSlug: string;
  scope: string;
}

/**
 * Verify an approved-guest JWT against its room slug. Returns the guest
 * identity, or null when the token is invalid, expired, issued for another
 * room, or carries the wrong scope.
 */
export function verifyGuestToken(
  jwtService: JwtService,
  config: ConfigService,
  token: string,
  roomSlug: string,
): { guestId: string; displayName: string } | null {
  try {
    const payload = jwtService.verify<GuestTokenClaims>(token, {
      secret: config.get<string>('JWT_GUEST_SECRET'),
    });
    if (payload.scope !== 'room' || payload.roomSlug !== roomSlug) return null;
    return { guestId: payload.guestId, displayName: payload.displayName };
  } catch {
    return null;
  }
}
