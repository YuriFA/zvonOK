import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipGuard = this.reflector.getAllAndOverride<boolean>(
      'skipAuthGuard',
      [context.getHandler(), context.getClass()],
    );

    if (skipGuard) {
      return true;
    }

    return super.canActivate(context) as boolean;
  }
}
