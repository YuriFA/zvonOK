import { randomBytes } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { PasswordHelper } from 'src/auth/helpers/password.helper';
import { ApiKeyHelper } from './api-key.helper';
import type {
  CreateProjectDto,
  LoginDeveloperDto,
  RegisterDeveloperDto,
} from './dto/developer.dto';

const DEV_TOKEN_TTL_MINUTES = 30;

@Injectable()
export class DeveloperService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDeveloperDto) {
    const existing = await this.prisma.developerAccount.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Username is already taken');
    }

    const account = await this.prisma.developerAccount.create({
      data: {
        username: dto.username,
        passwordHash: await PasswordHelper.hash(dto.password),
      },
    });

    return { token: this.issueToken(account.id, account.username) };
  }

  async login(dto: LoginDeveloperDto) {
    const account = await this.prisma.developerAccount.findUnique({
      where: { username: dto.username },
    });
    const passwordMatches =
      account &&
      (await PasswordHelper.compare(dto.password, account.passwordHash));

    if (!account || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { token: this.issueToken(account.id, account.username) };
  }

  async createProject(developerId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: { name: dto.name, developerAccountId: developerId },
    });
  }

  async createApiKey(developerId: string, projectId: string) {
    await this.findOwnedProject(developerId, projectId);

    const generated = ApiKeyHelper.generate();
    const record = await this.prisma.apiKey.create({
      data: {
        keyHash: generated.keyHash,
        prefix: generated.prefix,
        projectId,
      },
    });

    return {
      id: record.id,
      key: generated.key,
      prefix: record.prefix,
      createdAt: record.createdAt,
    };
  }

  async listApiKeys(developerId: string, projectId: string) {
    await this.findOwnedProject(developerId, projectId);

    const keys = await this.prisma.apiKey.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((key) => ({
      id: key.id,
      prefix: key.prefix,
      createdAt: key.createdAt,
      revokedAt: key.revokedAt,
    }));
  }

  async revokeApiKey(developerId: string, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, project: { developerAccountId: developerId } },
    });
    if (!key) {
      throw new NotFoundException('API key not found');
    }
    if (key.revokedAt) {
      return;
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
  }

  async setWebhook(developerId: string, projectId: string, url: string) {
    const project = await this.findOwnedProject(developerId, projectId);

    const secret = randomBytes(32).toString('base64url');
    await this.prisma.project.update({
      where: { id: project.id },
      data: { webhookUrl: url, webhookSecret: secret },
    });

    return { url, secret };
  }

  async removeWebhook(developerId: string, projectId: string): Promise<void> {
    const project = await this.findOwnedProject(developerId, projectId);

    await this.prisma.project.update({
      where: { id: project.id },
      data: { webhookUrl: null, webhookSecret: null },
    });
  }

  issueToken(id: string, username: string) {
    return this.jwt.sign(
      { username },
      {
        subject: id,
        secret: this.config.get<string>('JWT_DEV_SECRET'),
        expiresIn: `${DEV_TOKEN_TTL_MINUTES}m`,
      },
    );
  }

  private async findOwnedProject(developerId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, developerAccountId: developerId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
}
