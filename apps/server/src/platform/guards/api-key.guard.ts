import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiKeyHelper } from 'src/developer/api-key.helper';

export interface ApiKeyContext {
  id: string;
  projectId: string;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { apiKey?: ApiKeyContext }>();

    const header: string | undefined = request.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid API key');
    }

    const key = header.slice('Bearer '.length).trim();
    const keyHash = ApiKeyHelper.hash(key);

    const record = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      select: { id: true, projectId: true, revokedAt: true },
    });
    if (!record || record.revokedAt) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.apiKey = { id: record.id, projectId: record.projectId };
    return true;
  }
}
