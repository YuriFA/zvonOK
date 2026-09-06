import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';

/**
 * Signs webhook deliveries per the platform contract:
 * `X-Zvonok-Signature: sha256=HMAC-SHA256(secret, "{timestamp}.{rawBody}")`
 * where timestamp is unix seconds. The signature always covers the exact
 * bytes sent as the request body.
 */
@Injectable()
export class WebhookSigner {
  timestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  sign(secret: string, timestamp: number, body: string): string {
    const digest = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    return `sha256=${digest}`;
  }
}
