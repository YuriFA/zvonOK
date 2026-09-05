import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/bootstrap';
import { ApiKeyHelper } from '../src/developer/api-key.helper';
import { WorkerManager } from '../src/sfu/worker-manager';
import type { Server as NetServer } from 'node:net';

interface TestRoom {
  id: string;
  name?: string;
  slug: string;
  ownerId?: string;
  projectId?: string;
  status: string;
  maxParticipants: number;
}

describe('Developer platform (e2e)', () => {
  let app: INestApplication<App>;
  let httpUrl: string;
  const sockets: Socket[] = [];

  const generatedKey = ApiKeyHelper.generate();
  const keyRecord = {
    id: 'key-e2e',
    keyHash: generatedKey.keyHash,
    prefix: generatedKey.prefix,
    projectId: 'project-e2e',
    revokedAt: null as Date | null,
  };
  const rooms = new Map<string, TestRoom>();

  function connectSocket(): Socket {
    const socket = io(`${httpUrl}/sfu`, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
    });
    sockets.push(socket);
    return socket;
  }

  async function waitFor<T>(
    socket: Socket,
    event: string,
    timeoutMs = 3000,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timed out waiting for ${event}`)),
        timeoutMs,
      );
      socket.once(event, (payload: T) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        apiKey: {
          findUnique: jest.fn(
            ({ where }: { where: { keyHash?: string; id?: string } }) => {
              if (
                where.keyHash === keyRecord.keyHash ||
                where.id === keyRecord.id
              ) {
                return keyRecord;
              }
              return null;
            },
          ),
        },
        project: {
          findFirst: jest.fn().mockResolvedValue({ id: 'project-e2e' }),
        },
        room: {
          findUnique: jest.fn().mockResolvedValue(null),
          findFirst: jest.fn(
            ({ where }: { where: { id: string; projectId?: string } }) => {
              const room = rooms.get(where.id);
              if (!room) return null;
              if (where.projectId && room.projectId !== where.projectId) {
                return null;
              }
              return room;
            },
          ),
          findMany: jest.fn(() =>
            [...rooms.values()].filter(
              (room) => room.projectId === 'project-e2e',
            ),
          ),
          create: jest.fn(({ data }: { data: Partial<TestRoom> }) => {
            const room: TestRoom = {
              id: `room-${rooms.size + 1}`,
              slug: data.slug ?? 'slug',
              projectId: data.projectId,
              ownerId: data.ownerId,
              name: data.name,
              status: 'active',
              maxParticipants: data.maxParticipants ?? 10,
            };
            rooms.set(room.id, room);
            return room;
          }),
          update: jest.fn(
            ({ where, data }: { where: { id: string }; data: object }) => {
              const room = rooms.get(where.id);
              return Object.assign(room ?? {}, data);
            },
          ),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      })
      .overrideProvider(WorkerManager)
      .useValue({
        createRouter: jest.fn(),
        getRtpCapabilities: jest.fn(() => ({
          codecs: [],
          headerExtensions: [],
        })),
        getRouter: jest.fn(),
        closeRouter: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    await app.listen(0);

    const address = (app.getHttpServer() as unknown as NetServer).address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    httpUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    for (const socket of sockets) {
      socket.disconnect();
    }
    await app.close();
  });

  const bearer = { Authorization: `Bearer ${generatedKey.key}` };

  it('rejects /v1 requests without an API key', async () => {
    const response = await request(app.getHttpServer()).get('/v1/rooms');

    expect(response.status).toBe(401);
  });

  it('creates a project room via the public API', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/rooms')
      .set(bearer)
      .send({ maxParticipants: 5 });

    expect(response.status).toBe(201);
    expect(response.body.slug).toEqual(expect.any(String));
    (globalThis as Record<string, unknown>).__e2eRoomId = response.body.id;
  });

  it('joins via room token and receives peer events', async () => {
    const roomId = (globalThis as Record<string, unknown>)
      .__e2eRoomId as string;
    const mint = await request(app.getHttpServer())
      .post(`/v1/rooms/${roomId}/tokens`)
      .set(bearer)
      .send({ name: 'Alice' });

    expect(mint.status).toBe(201);
    expect(mint.body.token).toEqual(expect.any(String));
    expect(mint.body.expiresAt).toEqual(expect.any(String));

    const first = connectSocket();
    const joined = waitFor<{ routerRtpCapabilities: unknown }>(
      first,
      'sfu:joined',
    );
    first.emit('sfu:join', {
      roomId,
      userId: 'should-be-ignored',
      username: 'Ignored',
      token: mint.body.token,
    });

    const joinedPayload: { routerRtpCapabilities: unknown } = await joined;
    expect(joinedPayload.routerRtpCapabilities).toBeDefined();

    const secondMint = await request(app.getHttpServer())
      .post(`/v1/rooms/${roomId}/tokens`)
      .set(bearer)
      .send({ name: 'Bob' });

    const second = connectSocket();
    const peerJoined = waitFor<{ username?: string }>(first, 'sfu:peer-joined');
    const existing = waitFor<Array<{ username?: string }>>(
      second,
      'sfu:existing-peers',
    );
    second.emit('sfu:join', {
      roomId,
      userId: 'ignored-2',
      username: 'Ignored2',
      token: secondMint.body.token,
    });

    const peerJoinedPayload: { username?: string } = await peerJoined;
    expect(peerJoinedPayload.username).toBe('Bob');

    const existingPayload = await existing;
    expect(existingPayload).toEqual(
      expect.arrayContaining([expect.objectContaining({ username: 'Alice' })]),
    );
  });

  it('refuses publishing for a token without publish permission', async () => {
    const roomId = (globalThis as Record<string, unknown>)
      .__e2eRoomId as string;
    const mint = await request(app.getHttpServer())
      .post(`/v1/rooms/${roomId}/tokens`)
      .set(bearer)
      .send({ publish: false });

    const socket = connectSocket();
    const joined = waitFor(socket, 'sfu:joined');
    socket.emit('sfu:join', {
      roomId,
      userId: 'viewer',
      username: 'viewer',
      token: mint.body.token,
    });
    await joined;

    const produceError = waitFor<{ code?: string }>(
      socket,
      'sfu:produce-error',
    );
    socket.emit('sfu:produce', {
      requestId: 'req-e2e-1',
      transportId: 'nonexistent',
      kind: 'video',
      rtpParameters: {},
    });

    const error: { code?: string } = await produceError;
    expect(error.code).toBe('PUBLISH_NOT_ALLOWED');
  });

  it('refuses a token minted for a different room', async () => {
    const otherRoom = await request(app.getHttpServer())
      .post('/v1/rooms')
      .set(bearer)
      .send({});

    const mint = await request(app.getHttpServer())
      .post(`/v1/rooms/${otherRoom.body.id}/tokens`)
      .set(bearer)
      .send({});

    const socket = connectSocket();
    const joinError = waitFor<{ code?: string }>(socket, 'sfu:join-error');
    socket.emit('sfu:join', {
      roomId: (globalThis as Record<string, unknown>).__e2eRoomId as string,
      userId: 'u',
      username: 'u',
      token: mint.body.token,
    });

    const error: { code?: string } = await joinError;
    expect(error.code).toBe('ROOM_TOKEN_ROOM_MISMATCH');
  });

  it('ends a room via the public API', async () => {
    const roomId = (globalThis as Record<string, unknown>)
      .__e2eRoomId as string;
    const response = await request(app.getHttpServer())
      .delete(`/v1/rooms/${roomId}`)
      .set(bearer);

    expect(response.status).toBe(204);
    expect(rooms.get(roomId)?.status).toBe('ended');

    const mint = await request(app.getHttpServer())
      .post(`/v1/rooms/${roomId}/tokens`)
      .set(bearer)
      .send({});

    expect(mint.status).toBe(400);
  });
});
