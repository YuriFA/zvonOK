import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface DevAccountIdentity {
  id: string;
  username: string;
}

export const DevAccount = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DevAccountIdentity => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as DevAccountIdentity;
  },
);
