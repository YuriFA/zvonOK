import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ApiKeyContext } from './api-key.guard';

@Injectable()
export class PlatformThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const apiKey = (
      req as Record<string, unknown> & {
        apiKey?: ApiKeyContext;
      }
    ).apiKey;

    return apiKey?.id ?? ((req.ip as string) || 'unknown');
  }
}
