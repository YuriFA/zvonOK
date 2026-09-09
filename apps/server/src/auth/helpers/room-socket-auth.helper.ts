import type { Socket } from 'socket.io';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import { verifyGuestToken } from './guest-token.helper';

export type RoomSocketIdentity =
  | { type: 'user'; userId: string }
  | { type: 'guest'; guestId: string; roomSlug: string; displayName: string };

export interface RoomSocketIdentityOptions {
  /**
   * App origins allowed to authenticate through ambient cookies. Cookie
   * identities are accepted only when the handshake Origin matches one of
   * these; an explicit `handshake.auth.token` bypasses the check because it
   * is presented deliberately, not attached by the browser.
   */
  allowedOrigins?: string[];
}

/**
 * Resolve a room-scoped socket identity from the handshake: an approved
 * guest token bound to its room slug, or a registered user access token.
 * Returns null when neither cookie nor token authenticates.
 */
export function resolveRoomSocketIdentity(
  client: Socket,
  jwtService: JwtService,
  config: ConfigService,
  options?: RoomSocketIdentityOptions,
): RoomSocketIdentity | null {
  const explicit = extractAuthToken(client);
  if (explicit) return resolveToken(explicit, jwtService, config, client);

  if (options?.allowedOrigins?.length) {
    const origin = client.handshake.headers.origin;
    if (!origin || !isAllowedOrigin(origin, options.allowedOrigins)) {
      return null;
    }
  }

  const cookieToken = extractCookieToken(client);
  if (!cookieToken) return null;
  return resolveToken(cookieToken, jwtService, config, client);
}

function resolveToken(
  token: string,
  jwtService: JwtService,
  config: ConfigService,
  client: Socket,
): RoomSocketIdentity | null {
  // Try guest token first (uses a separate secret); the slug comes from the
  // cookie name, so an explicit auth.token without a guest cookie is only
  // validated as a user token.
  const roomSlug = extractGuestSlugFromCookie(client);
  if (roomSlug) {
    const guest = verifyGuestToken(jwtService, config, token, roomSlug);
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

function extractAuthToken(client: Socket): string | null {
  const auth = client.handshake.auth as Record<string, string | undefined>;
  return auth?.token ?? null;
}

function extractCookieToken(client: Socket): string | null {
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

function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  const normalize = (value: string) => value.replace(/\/+$/, '');
  return allowedOrigins.some(
    (allowed) => normalize(allowed) === normalize(origin),
  );
}
