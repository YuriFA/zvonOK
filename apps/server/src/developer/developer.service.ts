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
import { RecordingsService } from 'src/egress/recordings.service';
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
    private readonly recordings: RecordingsService,
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

  /**
   * Sign an app user into the developer console. The link is explicit:
   * a `DeveloperAccount` row with this user's id, created on first use with
   * the user's username (suffix when an unlinked account took it) and the
   * user's password hash, so the same credentials work at the manual login.
   */
  async ssoFromAppUser(userId: string) {
    const linked = await this.prisma.developerAccount.findUnique({
      where: { userId },
    });
    if (linked) {
      return {
        token: this.issueToken(linked.id, linked.username),
        username: linked.username,
        created: false,
      };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const account = await this.prisma.developerAccount.create({
      data: {
        username: await this.resolveFreeUsername(user.username),
        passwordHash: user.passwordHash,
        userId: user.id,
      },
    });
    return {
      token: this.issueToken(account.id, account.username),
      username: account.username,
      created: true,
    };
  }

  /** Append -2, -3, ... while an unlinked account holds the username. */
  private async resolveFreeUsername(base: string): Promise<string> {
    const taken = new Set<string>();
    const rows = await this.prisma.developerAccount.findMany({
      where: { username: { startsWith: base } },
      select: { username: true },
    });
    for (const row of rows) {
      taken.add(row.username);
    }
    if (!taken.has(base)) {
      return base;
    }
    for (let n = 2; n <= 100; n += 1) {
      const candidate = `${base}-${n}`;
      if (!taken.has(candidate)) {
        return candidate;
      }
    }
    throw new ConflictException('Could not derive a free developer username');
  }
  /**
   * The developer's own projects, newest first, with owned room counts.
   * The webhook signing secret is never returned here: it is shown once at
   * configuration time, like API keys.
   */
  async listProjects(developerId: string) {
    const projects = await this.prisma.project.findMany({
      where: { developerAccountId: developerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        createdAt: true,
        _count: { select: { rooms: true } },
      },
    });
    return projects.map(({ _count, ...project }) => ({
      ...project,
      roomCount: _count.rooms,
    }));
  }

  /** The project's rooms, newest first, lifecycle fields only. */
  async listProjectRooms(developerId: string, projectId: string) {
    await this.findOwnedProject(developerId, projectId);
    return this.prisma.room.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        endedAt: true,
      },
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

  /** The project's recorded egress sessions, newest first. */
  async listProjectRecordings(developerId: string, projectId: string) {
    await this.findOwnedProject(developerId, projectId);
    return this.recordings.list(projectId);
  }

  /**
   * Stream one of the project's recordings under developer auth. Ownership
   * is resolved here; the file logic (finalized MP4 vs raw parts, Range) is
   * RecordingsService's.
   */
  async downloadProjectRecording(
    developerId: string,
    projectId: string,
    egressId: string,
    options: { part?: number; rangeHeader?: string } = {},
  ) {
    await this.findOwnedProject(developerId, projectId);
    return this.recordings.download(projectId, egressId, options);
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
