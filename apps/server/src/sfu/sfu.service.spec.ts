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
});