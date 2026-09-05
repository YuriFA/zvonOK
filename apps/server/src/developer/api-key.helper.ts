import { createHash, randomBytes } from 'node:crypto';

const KEY_PREFIX = 'zk_live_';

export interface GeneratedApiKey {
  key: string;
  keyHash: string;
  prefix: string;
}

export class ApiKeyHelper {
  static generate(): GeneratedApiKey {
    const secret = randomBytes(32).toString('base64url');
    const key = `${KEY_PREFIX}${secret}`;
    return { key, keyHash: ApiKeyHelper.hash(key), prefix: key.slice(0, 15) };
  }

  static hash(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
