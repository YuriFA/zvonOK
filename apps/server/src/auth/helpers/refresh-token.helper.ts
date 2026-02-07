import { createHash, timingSafeEqual } from 'node:crypto';

export class RefreshTokenHelper {
  static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  static compare(token: string, hash: string): boolean {
    const tokenHash = RefreshTokenHelper.hash(token);
    const tokenBuffer = Buffer.from(tokenHash, 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');

    if (tokenBuffer.length !== hashBuffer.length) {
      return false;
    }

    return timingSafeEqual(tokenBuffer, hashBuffer);
  }
}
