import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiKeyContext } from '../guards/api-key.guard';

export const ApiKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyContext => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { apiKey?: ApiKeyContext }>();
    if (!request.apiKey) {
      throw new Error('ApiKeyGuard must run before the ApiKey decorator');
    }
    return request.apiKey;
  },
);
