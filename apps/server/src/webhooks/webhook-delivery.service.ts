import { Injectable, Logger } from '@nestjs/common';
import { WebhookSigner } from './webhook-signer';

/**
 * Performs a single signed webhook POST attempt. 2xx responses count as
 * success; network errors, timeouts and non-2xx responses count as failure.
 */
@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  constructor(private readonly signer: WebhookSigner) {}

  async deliver(url: string, body: string, secret: string): Promise<boolean> {
    const timestamp = this.signer.timestamp();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.attemptTimeoutMs());

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zvonok-Timestamp': String(timestamp),
          'X-Zvonok-Signature': this.signer.sign(secret, timestamp, body),
        },
        body,
        signal: controller.signal,
      });
      return response.ok;
    } catch (error) {
      this.logger.warn(
        `Webhook attempt to ${url} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  protected attemptTimeoutMs(): number {
    return 5_000;
  }
}
