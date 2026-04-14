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

  const createSocket = (id: string) =>
    ({
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
    (socket.emit as jest.Mock).mockReset();
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
      iceParameters: {
        usernameFragment: 'user',
        password: 'pass',
        iceLite: true,
      },
      iceCandidates: [],
      dtlsParameters: { fingerprints: [], role: 'auto' },
    } as unknown as WebRtcTransport;
    const router = {
      createWebRtcTransport: jest.fn().mockResolvedValue(transport),
    } as { createWebRtcTransport: jest.Mock };

    workerManager.createRouter.mockResolvedValue({} as never);
    workerManager.getRtpCapabilities.mockReturnValue(
      {} as unknown as RtpCapabilities,
    );
    workerManager.getRouter.mockReturnValue(router as never);

    await service.joinRoom(socket, {
      roomId: 'room-1',
      userId: 'user-1',
      username: 'alice',
      roomOwnerId: 'user-1',
    });
    (socket.emit as jest.Mock).mockReset();

    await service.createSendTransport(socket);

    expect(router.createWebRtcTransport).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('sfu:transport-created', {
      direction: 'send',
      transportId: 'send-1',
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      iceServers: [
        {
          urls: [
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
          ],
        },
      ],
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
    const producer = {
      id: 'producer-1',
      kind: 'video',
      paused: false,
      appData: {},
    } as never;
    const recvTransport = {
      id: 'recv-1',
      iceParameters: {
        usernameFragment: 'user',
        password: 'pass',
        iceLite: true,
      },
      iceCandidates: [],
      dtlsParameters: { fingerprints: [], role: 'auto' },
    } as unknown as WebRtcTransport;
    const router = {
      createWebRtcTransport: jest.fn().mockResolvedValue(recvTransport),
    } as { createWebRtcTransport: jest.Mock };

    const existingSocket = createSocket('socket-2');
    const serviceState = service as unknown as {
      peers: Map<
        string,
        {
          id: string;
          userId: string;
          username: string;
          socket: Socket;
          recvTransport?: WebRtcTransport;
          producers: Map<string, typeof producer>;
          consumers: Map<string, unknown>;
        }
      >;
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
    workerManager.getRtpCapabilities.mockReturnValue(
      {} as unknown as RtpCapabilities,
    );
    workerManager.getRouter.mockReturnValue(router as never);

    await service.joinRoom(socket, {
      roomId: 'room-1',
      userId: 'user-1',
      username: 'alice',
    });

    serviceState.rooms.set('room-1', new Set([socket.id, existingSocket.id]));
    (socket.emit as jest.Mock).mockReset();

    await service.createRecvTransport(socket);

    expect(socket.emit).toHaveBeenCalledWith('sfu:new-producer', {
      producerId: 'producer-1',
      userId: 'user-2',
      username: 'bob',
      kind: 'video',
      paused: false,
      appData: {},
    });
  });

  it('notifies other peers when a peer leaves the room', async () => {
    const otherSocket = createSocket('socket-2');
    const serviceState = service as unknown as {
      peers: Map<
        string,
        {
          id: string;
          userId: string;
          username: string;
          socket: Socket;
          producers: Map<string, unknown>;
          consumers: Map<string, unknown>;
        }
      >;
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
      peers: Map<
        string,
        {
          id: string;
          userId: string;
          username: string;
          socket: Socket;
          producers: Map<string, unknown>;
          consumers: Map<string, unknown>;
        }
      >;
      rooms: Map<string, Set<string>>;
      roomOwners: Map<string, string>;
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
    serviceState.rooms.set(
      'room-1',
      new Set([ownerSocket.id, targetSocket.id]),
    );
    serviceState.roomOwners.set('room-1', 'user-1');

    await service.kickPeer(ownerSocket, 'user-2');

    expect(targetSocket.emit).toHaveBeenCalledWith('sfu:kicked', {
      roomId: 'room-1',
    });
    expect(targetSocket.disconnect).toHaveBeenCalled();
    expect(ownerSocket.emit).toHaveBeenCalledWith('sfu:peer-left', {
      userId: 'user-2',
    });
  });

  it('emits sfu:room-ended to all peers and cleans up when a room is ended', async () => {
    const socket1 = createSocket('socket-1');
    const socket2 = createSocket('socket-2');
    const serviceState = service as unknown as {
      peers: Map<
        string,
        {
          id: string;
          userId: string;
          username: string;
          socket: Socket;
          sendTransport?: { close: jest.Mock };
          recvTransport?: { close: jest.Mock };
          producers: Map<string, unknown>;
          consumers: Map<string, unknown>;
        }
      >;
      rooms: Map<string, Set<string>>;
      roomOwners: Map<string, string>;
    };

    const sendClose1 = jest.fn();
    const recvClose1 = jest.fn();
    const sendClose2 = jest.fn();

    serviceState.peers.set(socket1.id, {
      id: socket1.id,
      userId: 'user-1',
      username: 'alice',
      socket: socket1,
      sendTransport: { close: sendClose1 } as never,
      recvTransport: { close: recvClose1 } as never,
      producers: new Map(),
      consumers: new Map(),
    });
    serviceState.peers.set(socket2.id, {
      id: socket2.id,
      userId: 'user-2',
      username: 'bob',
      socket: socket2,
      sendTransport: { close: sendClose2 } as never,
      producers: new Map(),
      consumers: new Map(),
    });
    serviceState.rooms.set('room-1', new Set([socket1.id, socket2.id]));
    serviceState.roomOwners.set('room-1', 'user-1');

    await service.endRoom('room-1');

    expect(socket1.emit).toHaveBeenCalledWith('sfu:room-ended', {
      roomId: 'room-1',
    });
    expect(socket2.emit).toHaveBeenCalledWith('sfu:room-ended', {
      roomId: 'room-1',
    });
    expect(sendClose1).toHaveBeenCalled();
    expect(recvClose1).toHaveBeenCalled();
    expect(sendClose2).toHaveBeenCalled();
    expect(workerManager.closeRouter).toHaveBeenCalledWith('room-1');

    expect(serviceState.rooms.has('room-1')).toBe(false);
    expect(serviceState.roomOwners.has('room-1')).toBe(false);
    expect(serviceState.peers.has(socket1.id)).toBe(false);
    expect(serviceState.peers.has(socket2.id)).toBe(false);
  });

  it('handles endRoom gracefully when room has no SFU peers', async () => {
    await service.endRoom('nonexistent-room');
    expect(workerManager.closeRouter).not.toHaveBeenCalled();
  });

  describe('screen share', () => {
    const serviceState = () =>
      service as unknown as {
        peers: Map<
          string,
          {
            id: string;
            userId: string;
            username: string;
            socket: Socket;
            sendTransport?: {
              id: string;
              produce: jest.Mock;
              close?: jest.Mock;
            };
            producers: Map<string, unknown>;
            consumers: Map<string, unknown>;
          }
        >;
        rooms: Map<string, Set<string>>;
        roomOwners: Map<string, string>;
        roomScreenShare: Map<string, string>;
      };

    it('creates a screen producer and notifies room', async () => {
      const otherSocket = createSocket('socket-2');
      const produce = jest.fn().mockResolvedValue({
        id: 'screen-producer-1',
        kind: 'video',
        appData: { source: 'screen' },
        close: jest.fn(),
        paused: false,
      });
      const state = serviceState();

      state.peers.set(socket.id, {
        id: socket.id,
        userId: 'user-1',
        username: 'alice',
        socket,
        sendTransport: { id: 'send-1', produce },
        producers: new Map(),
        consumers: new Map(),
      });
      state.peers.set(otherSocket.id, {
        id: otherSocket.id,
        userId: 'user-2',
        username: 'bob',
        socket: otherSocket,
        producers: new Map(),
        consumers: new Map(),
      });
      state.rooms.set('room-1', new Set([socket.id, otherSocket.id]));

      await service.createProducer(socket, {
        requestId: 'req-1',
        transportId: 'send-1',
        kind: 'video',
        rtpParameters: {} as never,
        appData: { source: 'screen' },
      });

      expect(produce).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'video',
          appData: { source: 'screen' },
        }),
      );
      expect(socket.emit).toHaveBeenCalledWith('sfu:producer-created', {
        requestId: 'req-1',
        producerId: 'screen-producer-1',
        userId: 'user-1',
        kind: 'video',
        appData: { source: 'screen' },
      });
      expect(otherSocket.emit).toHaveBeenCalledWith(
        'sfu:screen-share-started',
        {
          userId: 'user-1',
        },
      );
    });

    it('rejects a second screen share with SCREEN_SHARE_ALREADY_ACTIVE', async () => {
      const socket2 = createSocket('socket-2');
      const state = serviceState();

      state.peers.set(socket.id, {
        id: socket.id,
        userId: 'user-1',
        username: 'alice',
        socket,
        sendTransport: { id: 'send-1', produce: jest.fn() },
        producers: new Map(),
        consumers: new Map(),
      });
      state.peers.set(socket2.id, {
        id: socket2.id,
        userId: 'user-2',
        username: 'bob',
        socket: socket2,
        sendTransport: { id: 'send-1', produce: jest.fn() },
        producers: new Map(),
        consumers: new Map(),
      });
      state.rooms.set('room-1', new Set([socket.id, socket2.id]));
      state.roomScreenShare.set('room-1', socket.id);

      await service.createProducer(socket2, {
        requestId: 'req-2',
        transportId: 'send-1',
        kind: 'video',
        rtpParameters: {} as never,
        appData: { source: 'screen' },
      });

      expect(socket2.emit).toHaveBeenCalledWith('sfu:produce-error', {
        requestId: 'req-2',
        code: 'SCREEN_SHARE_ALREADY_ACTIVE',
        message: 'Another participant is already sharing',
      });
    });

    it('closes a screen producer and emits sfu:screen-share-stopped', async () => {
      const otherSocket = createSocket('socket-2');
      const close = jest.fn();
      const state = serviceState();

      state.peers.set(socket.id, {
        id: socket.id,
        userId: 'user-1',
        username: 'alice',
        socket,
        producers: new Map([
          [
            'screen-1',
            {
              id: 'screen-1',
              kind: 'video',
              appData: { source: 'screen' },
              close,
            },
          ],
        ]),
        consumers: new Map(),
      });
      state.peers.set(otherSocket.id, {
        id: otherSocket.id,
        userId: 'user-2',
        username: 'bob',
        socket: otherSocket,
        producers: new Map(),
        consumers: new Map(),
      });
      state.rooms.set('room-1', new Set([socket.id, otherSocket.id]));
      state.roomScreenShare.set('room-1', socket.id);

      service.closeProducer(socket.id, 'screen-1');

      expect(close).toHaveBeenCalled();
      expect(state.roomScreenShare.has('room-1')).toBe(false);
      expect(otherSocket.emit).toHaveBeenCalledWith(
        'sfu:screen-share-stopped',
        {
          userId: 'user-1',
        },
      );
    });

    it('releases screen share lock when a peer leaves', async () => {
      const otherSocket = createSocket('socket-2');
      const state = serviceState();

      state.peers.set(socket.id, {
        id: socket.id,
        userId: 'user-1',
        username: 'alice',
        socket,
        sendTransport: { close: jest.fn() },
        producers: new Map(),
        consumers: new Map(),
      });
      state.peers.set(otherSocket.id, {
        id: otherSocket.id,
        userId: 'user-2',
        username: 'bob',
        socket: otherSocket,
        producers: new Map(),
        consumers: new Map(),
      });
      state.rooms.set('room-1', new Set([socket.id, otherSocket.id]));
      state.roomScreenShare.set('room-1', socket.id);

      await service.leaveRoom(socket);

      expect(state.roomScreenShare.has('room-1')).toBe(false);
      expect(otherSocket.emit).toHaveBeenCalledWith(
        'sfu:screen-share-stopped',
        {
          userId: 'user-1',
        },
      );
    });

    it('releases screen share lock when a peer is kicked', async () => {
      const ownerSocket = createSocket('socket-owner');
      const targetSocket = {
        ...createSocket('socket-target'),
        disconnect: jest.fn(),
      } as unknown as Socket & { disconnect: jest.Mock };
      const state = serviceState();

      state.peers.set(ownerSocket.id, {
        id: ownerSocket.id,
        userId: 'user-1',
        username: 'alice',
        socket: ownerSocket,
        sendTransport: { close: jest.fn() },
        producers: new Map(),
        consumers: new Map(),
      });
      state.peers.set(targetSocket.id, {
        id: targetSocket.id,
        userId: 'user-2',
        username: 'bob',
        socket: targetSocket,
        sendTransport: { close: jest.fn() },
        producers: new Map(),
        consumers: new Map(),
      });
      state.rooms.set('room-1', new Set([ownerSocket.id, targetSocket.id]));
      state.roomOwners.set('room-1', 'user-1');
      state.roomScreenShare.set('room-1', targetSocket.id);

      await service.kickPeer(ownerSocket, 'user-2');

      expect(state.roomScreenShare.has('room-1')).toBe(false);
      expect(ownerSocket.emit).toHaveBeenCalledWith(
        'sfu:screen-share-stopped',
        {
          userId: 'user-2',
        },
      );
    });

    it('includes appData.source in sfu:new-producer broadcast', async () => {
      const otherSocket = createSocket('socket-2');
      const produce = jest.fn().mockResolvedValue({
        id: 'cam-producer-1',
        kind: 'video',
        appData: { source: 'camera' },
        close: jest.fn(),
        paused: false,
      });
      const state = serviceState();

      state.peers.set(socket.id, {
        id: socket.id,
        userId: 'user-1',
        username: 'alice',
        socket,
        sendTransport: { id: 'send-1', produce },
        producers: new Map(),
        consumers: new Map(),
      });
      state.peers.set(otherSocket.id, {
        id: otherSocket.id,
        userId: 'user-2',
        username: 'bob',
        socket: otherSocket,
        recvTransport: { id: 'recv-1' } as never,
        producers: new Map(),
        consumers: new Map(),
      });
      state.rooms.set('room-1', new Set([socket.id, otherSocket.id]));

      await service.createProducer(socket, {
        requestId: 'req-cam',
        transportId: 'send-1',
        kind: 'video',
        rtpParameters: {} as never,
        appData: { source: 'camera' },
      });

      expect(otherSocket.emit).toHaveBeenCalledWith('sfu:new-producer', {
        producerId: 'cam-producer-1',
        userId: 'user-1',
        username: 'alice',
        kind: 'video',
        paused: false,
        appData: { source: 'camera' },
      });
    });
  });
});
