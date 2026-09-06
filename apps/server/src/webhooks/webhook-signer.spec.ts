import { createHmac } from 'node:crypto';
import { WebhookSigner } from './webhook-signer';

describe('WebhookSigner', () => {
  const signer = new WebhookSigner();

  it('signs with HMAC-SHA256 over "timestamp.body" prefixed with sha256=', () => {
    const timestamp = 1_700_000_000;
    const body = '{"type":"room.started"}';

    const signature = signer.sign('webhook-secret', timestamp, body);

    const expected = createHmac('sha256', 'webhook-secret')
      .update(`${timestamp}.${body}`)
      .digest('hex');
    expect(signature).toBe(`sha256=${expected}`);
  });

  it('produces a different signature when the secret, timestamp or body differs', () => {
    const base = signer.sign('secret-a', 1_000, '{"a":1}');

    expect(signer.sign('secret-b', 1_000, '{"a":1}')).not.toBe(base);
    expect(signer.sign('secret-a', 2_000, '{"a":1}')).not.toBe(base);
    expect(signer.sign('secret-a', 1_000, '{"a":2}')).not.toBe(base);
  });

  it('returns the current unix time in seconds', () => {
    const before = Math.floor(Date.now() / 1000);
    const timestamp = signer.timestamp();
    const after = Math.floor(Date.now() / 1000);

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
    expect(Number.isInteger(timestamp)).toBe(true);
  });
});
