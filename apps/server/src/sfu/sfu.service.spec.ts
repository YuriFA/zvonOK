import type { Socket } from 'socket.io';
import type { RtpCapabilities, WebRtcTransport } from 'mediasoup/types';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { SfuService } from './sfu.service';
import { WorkerManager } from './worker-manager';

type SfuServiceState = {
  peers: Map<string, unknown>;
};

describe('SfuService', () => {
  let service: SfuService;
  let workerManager: jest.Mocked<WorkerManager>;

  const socket = {
    id: 'socket-1',
    emit: jest.fn(),
  } as unknown as Socket;

  const createSocket = (id: string) => ({
    id,
    emit: jest.fn(),
  }) as unknown as Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SfuService,
        {
          provide: WorkerManager,
          useValue: {
            createRouter: jest.fn(),
            getRtpCapabilities: jest.fn(),
            getRouter: jest.fn(),
            closeRouter: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SfuService>(SfuService);
    workerManager = module.get(WorkerManager);
    socket.emit.mockReset();
  });

  it('joins a room and emits RTP capabilities', async () => {
    const routerRtpCapabilities = { codecs: [] } as unknown as RtpCapabilities;
    workerManager.createRouter.mockResolvedValue({} as never);
    workerManager.getRtpCapabilities.mockReturnValue(routerRtpCapabilities);

    await service.joinRoom(socket, {
      roomId: 'room-1',
      userId: 'user-1',
      username: 'alice',
      roomOwnerId: 'user-1',
    });

    expect(workerManager.createRouter).toHaveBeenCalledWith('room-1');
    expect(socket.emit).toHaveBeenCalledWith('sfu:joined', {
      routerRtpCapabilities,
    });
  });

  it('creates a send transport and exposes its direction in the payload', async () => {
    const transport = {
      id: 'send-1',
      iceParameters: { usernameFragment: 'user', password: 'pass', iceLite: true },
      iceCandidates: [],
      dtlsParameters: { fingerprints: [], role: 'auto' },
    } as unknown as WebRtcTransport;
    const router = {
      createWebRtcTransport: jest.fn().mockResolvedValue(transport),
    } as { createWebRtcTransport: jest.Mock };

    workerManager.createRouter.mockResolvedValue({} as never);
    workerManager.getRtpCapabilities.mockReturnValue({} as unknown as RtpCapabilities);
    workerManager.getRouter.mockReturnValue(router as never);

    await service.joinRoom(socket, {
      roomId: 'room-1',
      userId: 'user-1',
      username: 'alice',
      roomOwnerId: 'user-1',
    });
    socket.emit.mockReset();

    await service.createSendTransport(socket);

    expect(router.createWebRtcTransport).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('sfu:transport-created', {
      direction: 'send',
      transportId: 'send-1',
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });
  });

  it('connects a matching transport with client DTLS parameters', async () => {
    const connect = jest.fn().mockResolvedValue(undefined);
    const peer = {
      id: socket.id,
      userId: 'user-1',
      username: 'alice',
      socket,
      sendTransport: { id: 'send-1', connect },
      producers: new Map(),
      consumers: new Map(),
    } as never;

    const serviceState = service as unknown as SfuServiceState;
    serviceState.peers.set(socket.id, peer);

    await service.connectTransport(socket, {
      transportId: 'send-1',
      dtlsParameters: { fingerprints: [], role: 'client' } as never,
    });

    expect(connect).toHaveBeenCalledWith({
      dtlsParameters: { fingerprints: [], role: 'client' },
    });
    expect(socket.emit).toHaveBeenCalledWith('sfu:transport-connected', {
      transportId: 'send-1',
    });
  });

  it('resumes a paused consumer after client acknowledgement', async () => {
    const resume = jest.fn().mockResolvedValue(undefined);
    const peer = {
      id: socket.id,
      userId: 'user-1',
      username: 'alice',
      socket,
      producers: new Map(),
      consumers: new Map([['consumer-1', { resume }]]),
    } as never;

    const serviceState = service as unknown as SfuServiceState;
    serviceState.peers.set(socket.id, peer);

    await service.resumeConsumer(socket, 'consumer-1');

    expect(resume).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('sfu:consumer-resumed', {
      consumerId: 'consumer-1',
    });
  });

  it('announces existing producers when a recv transport is created', async () => {
    const producer = { id: 'producer-1', kind: 'video' } as never;
    const recvTransport = {
      id: 'recv-1',
      iceParameters: { usernameFragment: 'user', password: 'pass', iceLite: true },
      iceCandidates: [],
      dtlsParameters: { fingerprints: [], role: 'auto' },
    } as unknown as WebRtcTransport;
    const router = {
      createWebRtcTransport: jest.fn().mockResolvedValue(recvTransport),
    } as { createWebRtcTransport: jest.Mock };

    const existingSocket = createSocket('socket-2');
    const serviceState = service as unknown as {
      peers: Map<string, {
        id: string;
        userId: string;
        username: string;
        socket: Socket;
        recvTransport?: WebRtcTransport;
        producers: Map<string, typeof producer>;
        consumers: Map<string, unknown>;
      }>;
      rooms: Map<string, Set<string>>;
    };

    serviceState.peers.set(existingSocket.id, {
      id: existingSocket.id,
      userId: 'user-2',
      username: 'bob',
      socket: existingSocket,
      recvTransport,
      producers: new Map([['producer-1', producer]]),
      consumers: new Map(),
    });

    workerManager.createRouter.mockResolvedValue({} as never);
    workerManager.getRtpCapabilities.mockReturnValue({} as unknown as RtpCapabilities);
    workerManager.getRouter.mockReturnValue(router as never);

    await service.joinRoom(socket, {
      roomId: 'room-1',
      userId: 'user-1',
      username: 'alice',
    });

    serviceState.rooms.set('room-1', new Set([socket.id, existingSocket.id]));
    socket.emit.mockReset();

    await service.createRecvTransport(socket);

    expect(socket.emit).toHaveBeenCalledWith('sfu:new-producer', {
      producerId: 'producer-1',
      userId: 'user-2',
      username: 'bob',
      kind: 'video',
    });
  });

  it('notifies other peers when a peer leaves the room', async () => {
    const otherSocket = createSocket('socket-2');
    const serviceState = service as unknown as {
      peers: Map<string, {
        id: string;
        userId: string;
        username: string;
        socket: Socket;
        producers: Map<string, unknown>;
        consumers: Map<string, unknown>;
      }>;
      rooms: Map<string, Set<string>>;
      roomOwners: Map<string, string>;
    };

    serviceState.peers.set(socket.id, {
      id: socket.id,
      userId: 'user-1',
      username: 'alice',
      socket,
      producers: new Map(),
      consumers: new Map(),
    });
    serviceState.peers.set(otherSocket.id, {
      id: otherSocket.id,
      userId: 'user-2',
      username: 'bob',
      socket: otherSocket,
      producers: new Map(),
      consumers: new Map(),
    });
    serviceState.rooms.set('room-1', new Set([socket.id, otherSocket.id]));

    await service.leaveRoom(socket);

    expect(otherSocket.emit).toHaveBeenCalledWith('sfu:peer-left', {
      userId: 'user-1',
    });
  });

  it('allows the room owner to kick another peer', async () => {
    const ownerSocket = createSocket('socket-owner');
    const targetSocket = {
      ...createSocket('socket-target'),
      disconnect: jest.fn(),
    } as unknown as Socket & { disconnect: jest.Mock };
    const serviceState = service as unknown as {
      peers: Map<string, {
        id: string;
        userId: string;
        username: string;
        socket: Socket;
        producers: Map<string, unknown>;
        consumers: Map<string, unknown>;
      }>;
      rooms: Map<string, Set<string>>;
    };

    serviceState.peers.set(ownerSocket.id, {
      id: ownerSocket.id,
      userId: 'user-1',
      username: 'alice',
      socket: ownerSocket,
      producers: new Map(),
      consumers: new Map(),
    });
    serviceState.peers.set(targetSocket.id, {
      id: targetSocket.id,
      userId: 'user-2',
      username: 'bob',
      socket: targetSocket,
      producers: new Map(),
      consumers: new Map(),
    });
    serviceState.rooms.set('room-1', new Set([ownerSocket.id, targetSocket.id]));
    serviceState.roomOwners.set('room-1', 'user-1');

    await service.kickPeer(ownerSocket, 'user-2');

    expect(targetSocket.emit).toHaveBeenCalledWith('sfu:kicked', { roomId: 'room-1' });
    expect(targetSocket.disconnect).toHaveBeenCalled();
    expect(ownerSocket.emit).toHaveBeenCalledWith('sfu:peer-left', {
      userId: 'user-2',
    });
  });
});