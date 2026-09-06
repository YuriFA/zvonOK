import type { Socket } from 'socket.io';
import type { JwtService } from '@nestjs/jwt';
import type { GuestService } from '../../room/guest.service';

export type RoomSocketIdentity =
  | { type: 'user'; userId: string }
  | { type: 'guest'; guestId: string; roomSlug: string; displayName: string };

/**
 * Resolve a room-scoped socket identity from the handshake: an approved
 * guest token bound to its room slug, or a registered user access token.
 * Returns null when neither cookie nor token authenticates.
 */
export function resolveRoomSocketIdentity(
  client: Socket,
  jwtService: JwtService,
  guestService: GuestService,
): RoomSocketIdentity | null {
  const token = extractToken(client);
  if (!token) return null;

  // Try guest token first (uses a separate secret)
  const roomSlug = extractGuestSlugFromCookie(client);
  if (roomSlug) {
    const guest = guestService.validateGuestToken(token, roomSlug);
    if (guest) {
      return {
        type: 'guest',
        guestId: guest.guestId,
        roomSlug,
        displayName: guest.displayName,
      };
    }
  }

  // Fall back to user token
  try {
    const payload = jwtService.verify<{ id: string }>(token);
    return { type: 'user', userId: payload.id };
  } catch {
    return null;
  }
}

function extractToken(client: Socket): string | null {
  const auth = client.handshake.auth as Record<string, string | undefined>;
  if (auth?.token) return auth.token;

  const cookieHeader = client.handshake.headers?.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split('; ');

  const accessCookie = cookies.find((c: string) =>
    c.startsWith('access_token='),
  );
  if (accessCookie) return accessCookie.split('=').slice(1).join('=') || null;

  const guestCookie = cookies.find((c: string) =>
    c.startsWith('zvonok_guest_'),
  );
  if (guestCookie) return guestCookie.split('=').slice(1).join('=') || null;

  return null;
}

function extractGuestSlugFromCookie(client: Socket): string | null {
  const cookieHeader = client.handshake.headers?.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split('; ')
    .find((c: string) => c.startsWith('zvonok_guest_'));
  if (!match) return null;
  const key = match.split('=')[0];
  return key.replace('zvonok_guest_', '') || null;
}
