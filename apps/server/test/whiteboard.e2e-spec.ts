import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { io, Socket } from 'socket.io-client';
import { App } from 'supertest/types';
import type { Server as NetServer } from 'node:net';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/bootstrap';
import { WorkerManager } from '../src/sfu/worker-manager';
import { RoomTokenHelper } from '../src/platform/room-token.helper';


interface TestRoom {
  id: string;
  slug: string;
  ownerId?: string;
  projectId?: string;
  status: string;
  maxParticipants: number;
}

const ROOM: TestRoom = {
  id: 'room-wb',
  slug: 'wb-slug',
  ownerId: 'owner-1',
  projectId: 'project-e2e',
  status: 'active',
  maxParticipants: 10,
};

describe('Whiteboard (e2e)', () => {
  let app: INestApplication<App>;
  let httpUrl: string;
  let jwtService: JwtService;
  let guestSecret: string;
  const sockets: Socket[] = [];
  let ownerSocket: Socket;
  function connectWhiteboard(options: {
    auth?: { token: string };
    cookie?: string;
  }): Socket {
    const socket = io(`${httpUrl}/whiteboard`, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
      ...(options.auth ? { auth: options.auth } : {}),
      ...(options.cookie ? { extraHeaders: { Cookie: options.cookie } } : {}),
    });
    sockets.push(socket);
    return socket;
  }

  function connectSfu(token: string): Socket {
    const socket = io(`${httpUrl}/sfu`, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
    });
    sockets.push(socket);
    socket.emit('sfu:join', {
      roomId: ROOM.id,
      userId: 'ignored',
      username: 'Ignored',
      roomSlug: ROOM.slug,
      token,
    });
    return socket;
  }

  function waitFor<T>(
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

  function expectSilence(
    socket: Socket,
    event: string,
    ms: number,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => resolve(), ms);
      socket.once(event, () => {
        clearTimeout(timer);
        reject(new Error(`Expected silence but received ${event}`));
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
          findUnique: jest.fn().mockResolvedValue({ revokedAt: null }),
        },
        project: {
          findUnique: jest.fn().mockResolvedValue({ id: 'project-e2e' }),
        },
        egress: {
          findUnique: jest.fn().mockResolvedValue(null),
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        room: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn(
            ({ where }: { where: { slug?: string; id?: string } }) => {
              if (where.slug) return where.slug === ROOM.slug ? ROOM : null;
              if (where.id) return where.id === ROOM.id ? ROOM : null;
              return null;
            },
          ),
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
    jwtService = app.get(JwtService);
    guestSecret = app.get(ConfigService).get<string>('JWT_GUEST_SECRET') ?? '';
  });

  afterAll(async () => {
    for (const socket of sockets) socket.disconnect();
    await app.close();
  });
  it('syncs the board between an owner and a guest, catches up a late joiner, and enforces the host draw-lock', async () => {
    // Owner must be an active SFU peer before the board admits them.
    const roomToken = app.get(RoomTokenHelper).mint({
      roomId: ROOM.id,
      projectId: 'project-e2e',
      keyId: 'key-e2e',
      participantId: 'owner-1',
      name: 'Owner',
      publish: true,
      admin: true,
    });
    const sfuSocket = connectSfu(roomToken);
    await waitFor(sfuSocket, 'sfu:joined');

    // Owner joins the board and receives the initial blank snapshot.
    const owner = connectWhiteboard({
      auth: { token: jwtService.sign({ id: 'owner-1' }) },
    });
    const ownerSnapshot = waitFor<{ snapshot: string; mode: string }>(
      owner,
      'whiteboard:snapshot',
    );
    owner.emit('whiteboard:join', { roomSlug: ROOM.slug });
    const initial = await ownerSnapshot;
    expect(initial.snapshot).toBe('{}');
    ownerSocket = owner;

    // Guest joins with a cookie bound to this room and sees the same board.
    const guestToken = jwtService.sign(
      {
        guestId: 'guest-1',
        displayName: 'Guesty',
        roomSlug: ROOM.slug,
        scope: 'room',
      },
      { secret: guestSecret },
    );
    const guest = connectWhiteboard({
      cookie: `zvonok_guest_${ROOM.slug}=${guestToken}`,
    });
    const guestSnapshot = waitFor<{ snapshot: string; mode: string }>(
      guest,
      'whiteboard:snapshot',
    );
    guest.emit('whiteboard:join', { roomSlug: ROOM.slug });
    await expect(guestSnapshot).resolves.toMatchObject({ mode: 'owner' });

    // A guest cookie bound to another room is rejected.
    const strangerToken = jwtService.sign(
      {
        guestId: 'guest-2',
        displayName: 'Stranger',
        roomSlug: 'other-slug',
        scope: 'room',
      },
      { secret: guestSecret },
    );
    const stranger = connectWhiteboard({
      cookie: `zvonok_guest_other-slug=${strangerToken}`,
    });
    const strangerJoin = waitFor<unknown>(stranger, 'whiteboard:error');
    stranger.emit('whiteboard:join', { roomSlug: ROOM.slug });
    await strangerJoin;
    stranger.disconnect();

    // Owner draws (mode owner-only): the guest receives the relayed snapshot.
    const shapeOne = {
      store: { 'shape:1': { id: 'shape:1', typeName: 'shape', x: 1 } },
    };
    const guestOp = waitFor<{ snapshot: string }>(guest, 'whiteboard:op');
    owner.emit('whiteboard:op', {
      roomSlug: ROOM.slug,
      snapshot: JSON.stringify(shapeOne),
    });
    const relayed = await guestOp;
    expect(JSON.parse(relayed.snapshot)).toMatchObject(shapeOne);

    // Guest is locked out while drawing is owner-only: nothing is relayed.
    guest.emit('whiteboard:op', {
      roomSlug: ROOM.slug,
      snapshot: JSON.stringify({
        store: { 'shape:2': { id: 'shape:2', typeName: 'shape', x: 2 } },
      }),
    });
    await expectSilence(owner, 'whiteboard:op', 300);

    // ...and nothing was stored: the next snapshot catch-up stays at shape:1.
    const lateObserver = connectWhiteboard({
      auth: { token: jwtService.sign({ id: 'late-1' }) },
    });
    // Not an SFU peer: admission must refuse despite a valid token.
    const lateRefused = waitFor<unknown>(lateObserver, 'whiteboard:error');
    lateObserver.emit('whiteboard:join', { roomSlug: ROOM.slug });
    await lateRefused;
    lateObserver.disconnect();

    // Owner opens drawing; the mode change reaches the guest live.
    const guestMode = waitFor<{ mode: string }>(guest, 'whiteboard:mode');
    owner.emit('whiteboard:mode', { roomSlug: ROOM.slug, mode: 'open' });
    await expect(guestMode).resolves.toMatchObject({ mode: 'open' });

    // Now the guest's edit relays to the owner and merges both shapes.
    const ownerOp = waitFor<{ snapshot: string }>(owner, 'whiteboard:op');
    guest.emit('whiteboard:op', {
      roomSlug: ROOM.slug,
      snapshot: JSON.stringify({
        store: {
          'shape:1': { id: 'shape:1', typeName: 'shape', x: 1 },
          'shape:2': { id: 'shape:2', typeName: 'shape', x: 2 },
        },
      }),
    });
    const merged = await ownerOp;
    const parsed = JSON.parse(merged.snapshot);
    expect(Object.keys(parsed.store).sort()).toEqual(['shape:1', 'shape:2']);

    // Owner locks drawing again: further guest edits stop relaying.
    const guestLocked = waitFor<{ mode: string }>(guest, 'whiteboard:mode');
    owner.emit('whiteboard:mode', { roomSlug: ROOM.slug, mode: 'owner' });
    await expect(guestLocked).resolves.toMatchObject({ mode: 'owner' });
    guest.emit('whiteboard:op', {
      roomSlug: ROOM.slug,
      snapshot: JSON.stringify({
        store: { 'shape:3': { id: 'shape:3', typeName: 'shape', x: 3 } },
      }),
    });
    await expectSilence(owner, 'whiteboard:op', 300);
  });

  it('serves the current board to a guest who re-joins mid-session', async () => {
    const owner = ownerSocket;
    expect(owner.connected).toBe(true);
    const guestToken = jwtService.sign(
      {
        guestId: 'guest-1',
        displayName: 'Guesty',
        roomSlug: ROOM.slug,
        scope: 'room',
      },
      { secret: guestSecret },
    );
    const rejoining = connectWhiteboard({
      cookie: `zvonok_guest_${ROOM.slug}=${guestToken}`,
    });
    const snapshot = waitFor<{ snapshot: string }>(
      rejoining,
      'whiteboard:snapshot',
    );
    rejoining.emit('whiteboard:join', { roomSlug: ROOM.slug });
    const caught = await snapshot;
    // Board state persists in memory for the room lifetime: re-open sees it.
    expect(JSON.parse(caught.snapshot).store).toHaveProperty('shape:1');
  });
});
