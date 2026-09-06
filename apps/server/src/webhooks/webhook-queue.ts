import { Injectable, Logger } from '@nestjs/common';

/**
 * Delays between delivery attempts: initial attempt plus up to 5 retries,
 * then the delivery is dropped.
 */
export const WEBHOOK_RETRY_DELAYS_MS = [
  10_000, 30_000, 120_000, 600_000, 1_800_000,
] as const;

/**
 * Per-project FIFO delivery chain. Each project's deliveries run strictly in
 * enqueue order (a delivery's retries block the next one), while chains of
 * different projects run independently.
 */
@Injectable()
export class WebhookQueue {
  private readonly logger = new Logger(WebhookQueue.name);
  private readonly tails = new Map<string, Promise<void>>();

  /**
   * Runs `attempt` at the tail of the project's chain: first immediately,
   * then after each backoff delay while it reports failure (never throwing).
   * An attempt returning true means delivered, or permanently given up
   * (e.g. the webhook config was removed) - either way the chain moves on.
   */
  enqueueDelivery(projectId: string, attempt: () => Promise<boolean>): void {
    const previous = this.tails.get(projectId) ?? Promise.resolve();
    const run = previous.then(() => this.runWithRetries(projectId, attempt));
    const tail = run.catch((error) => {
      this.logger.error(
        `Webhook delivery chain failed for project ${projectId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
    this.tails.set(projectId, tail);
    void tail.then(() => {
      if (this.tails.get(projectId) === tail) {
        this.tails.delete(projectId);
      }
    });
  }

  private async runWithRetries(
    projectId: string,
    attempt: () => Promise<boolean>,
  ): Promise<void> {
    let delivered = await attempt();
    for (const delayMs of WEBHOOK_RETRY_DELAYS_MS) {
      if (delivered) return;
      await this.delay(delayMs);
      delivered = await attempt();
    }
    if (!delivered) {
      this.logger.warn(
        `Webhook delivery dropped for project ${projectId} after ${
          WEBHOOK_RETRY_DELAYS_MS.length + 1
        } attempts`,
      );
    }
  }

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
