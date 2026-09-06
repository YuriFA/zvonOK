import { createHmac } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhookSigner } from './webhook-signer';

interface RecordedRequest {
  method: string;
  url: string;
  headers: IncomingMessage['headers'];
  rawBody: string;
}

interface StubHandle {
  url: string;
  requests: RecordedRequest[];
  close: () => Promise<void>;
}

async function startStub(
  respond: (req: RecordedRequest, res: ServerResponse) => void,
): Promise<StubHandle> {
  const requests: RecordedRequest[] = [];
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const request: RecordedRequest = {
        method: req.method ?? '',
        url: req.url ?? '',
        headers: req.headers,
        rawBody: Buffer.concat(chunks).toString('utf8'),
      };
      requests.push(request);
      respond(request, res);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}/hook`,
    requests,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

describe('WebhookDeliveryService', () => {
  const secret = 'delivery-test-secret';
  const body = JSON.stringify({ type: 'room.started', data: { n: 1 } });
  let service: WebhookDeliveryService;

  beforeEach(() => {
    service = new WebhookDeliveryService(new WebhookSigner());
  });

  it('posts the body as JSON with timestamp and valid signature headers', async () => {
    const stub = await startStub((_request, res) => {
      res.statusCode = 200;
      res.end();
    });

    const delivered = await service.deliver(stub.url, body, secret);
    await stub.close();

    expect(delivered).toBe(true);
    expect(stub.requests).toHaveLength(1);
    const request = stub.requests[0];
    expect(request.method).toBe('POST');
    expect(request.headers['content-type']).toBe('application/json');
    expect(request.rawBody).toBe(body);

    const timestampHeader = request.headers['x-zvonok-timestamp'] as string;
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(Math.abs(Number(timestampHeader) - nowSeconds)).toBeLessThanOrEqual(
      5,
    );

    const expectedSignature = `sha256=${createHmac('sha256', secret)
      .update(`${timestampHeader}.${request.rawBody}`)
      .digest('hex')}`;
    expect(request.headers['x-zvonok-signature']).toBe(expectedSignature);
  });

  it('treats every 2xx status as success', async () => {
    for (const status of [200, 201, 202, 204]) {
      const stub = await startStub((_request, res) => {
        res.statusCode = status;
        res.end();
      });
      await expect(service.deliver(stub.url, body, secret)).resolves.toBe(true);
      await stub.close();
    }
  });

  it('treats non-2xx statuses as failure', async () => {
    const stub = await startStub((_request, res) => {
      res.statusCode = 500;
      res.end('boom');
    });

    await expect(service.deliver(stub.url, body, secret)).resolves.toBe(false);
    await stub.close();
  });

  it('treats connection failures as failure', async () => {
    // Nothing listens on loopback port 1: the POST fails at the network
    // layer, which must surface as a failed attempt, never a throw.
    await expect(
      service.deliver('http://127.0.0.1:1/hook', body, secret),
    ).resolves.toBe(false);
  });

  it('aborts attempts that exceed the timeout', async () => {
    const shortService = new (class extends WebhookDeliveryService {
      protected override attemptTimeoutMs(): number {
        return 100;
      }
    })(new WebhookSigner());

    // A stub that never responds: the AbortController must fire and fail
    // the attempt after the (shortened) timeout instead of hanging.
    const stub = await startStub(() => undefined);

    const delivered = await shortService.deliver(stub.url, body, secret);
    await stub.close();

    expect(delivered).toBe(false);
    expect(stub.requests).toHaveLength(1);
  });
});
