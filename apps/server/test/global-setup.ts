/**
 * Runs in the main Jest process before test workers spawn: the webhook e2e
 * spec serves deliveries from an in-process HTTPS receiver with a throwaway
 * self-signed certificate, so outbound certificate validation must be off
 * before the test environment (and its fetch stack) is created.
 */
export default async function globalSetup(): Promise<void> {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
}
