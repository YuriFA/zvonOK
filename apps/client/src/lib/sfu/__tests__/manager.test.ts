import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testContext = vi.hoisted(() => {
  type EventHandler = (...args: unknown[]) => unknown;

  const socketHandlers = new Map<string, Set<EventHandler>>();
  const sendTransportHandlers = new Map<string, EventHandler>();
  const recvTransportHandlers = new Map<string, EventHandler>();

  const mockProducer = {
    id: 'producer-1',
    kind: 'video' as const,
    on: vi.fn(),
    close: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    replaceTrack: vi.fn().mockResolvedValue(undefined),
  };

  const mockConsumerTrack = {
    id: 'track-1',
    kind: 'video' as const,
  } as MediaStreamTrack;

  const mockConsumer = {
    id: 'consumer-1',
    producerId: 'producer-remote',
    track: mockConsumerTrack,
    on: vi.fn(),
    close: vi.fn(),
  };

  const mockSendTransport = {
    id: 'send-transport',
    on: vi.fn((event: string, handler: EventHandler) => {
      sendTransportHandlers.set(event, handler);
    }),
    produce: vi.fn().mockResolvedValue(mockProducer),
    close: vi.fn(),
  };

  const mockRecvTransport = {
    id: 'recv-transport',
    on: vi.fn((event: string, handler: EventHandler) => {
      recvTransportHandlers.set(event, handler);
    }),
    consume: vi.fn().mockResolvedValue(mockConsumer),
    close: vi.fn(),
  };

  const mockDeviceLoad = vi.fn().mockResolvedValue(undefined);
  const mockCreateSendTransport = vi.fn(() => mockSendTransport);
  const mockCreateRecvTransport = vi.fn(() => mockRecvTransport);

  const latestDevice = {
    current: null as null | {
      load: typeof mockDeviceLoad;
      createSendTransport: typeof mockCreateSendTransport;
      createRecvTransport: typeof mockCreateRecvTransport;
      rtpCapabilities: { codecs: string[] };
    },
  };

  const mockSocket = {
    connected: false,
    on: vi.fn((event: string, handler: EventHandler) => {
      if (!socketHandlers.has(event)) {
        socketHandlers.set(event, new Set());
      }
      socketHandlers.get(event)?.add(handler);
      return mockSocket;
    }),
    off: vi.fn((event: string, handler?: EventHandler) => {
      if (!handler) {
        socketHandlers.delete(event);
        return mockSocket;
      }

      socketHandlers.get(event)?.delete(handler);
      return mockSocket;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };

  const reset = () => {
    socketHandlers.clear();
    sendTransportHandlers.clear();
    recvTransportHandlers.clear();
    mockSocket.connected = false;
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();
    mockProducer.on.mockClear();
    mockProducer.close.mockClear();
    mockProducer.pause.mockClear();
    mockProducer.resume.mockClear();
    mockProducer.replaceTrack.mockClear();
    mockConsumer.on.mockClear();
    mockConsumer.close.mockClear();
    mockSendTransport.on.mockClear();
    mockSendTransport.produce.mockClear();
    mockSendTransport.close.mockClear();
    mockRecvTransport.on.mockClear();
    mockRecvTransport.consume.mockClear();
    mockRecvTransport.close.mockClear();
    mockDeviceLoad.mockClear();
    mockCreateSendTransport.mockClear();
    mockCreateRecvTransport.mockClear();
    latestDevice.current = null;
  };

  const emitSocketEvent = async (event: string, payload?: unknown) => {
    const handlers = Array.from(socketHandlers.get(event) ?? []);
    await Promise.all(
      handlers.map((handler) => handler(payload))
    );
  };

  return {
    latestDevice,
    mockConsumer,
    mockConsumerTrack,
    mockCreateRecvTransport,
    mockCreateSendTransport,
    mockDeviceLoad,
    mockProducer,
    mockRecvTransport,
    mockSendTransport,
    mockSocket,
    emitSocketEvent,
    reset,
  };
});

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => testContext.mockSocket),
}));

vi.mock('mediasoup-client', () => ({
  Device: class MockDevice {
    load = testContext.mockDeviceLoad;
    createSendTransport = testContext.mockCreateSendTransport;
    createRecvTransport = testContext.mockCreateRecvTransport;
    rtpCapabilities = { codecs: ['vp8'] };

    constructor() {
      testContext.latestDevice.current = this;
    }
  },
}));

import { SfuManager } from '../manager';

const transportPayload = {
  transportId: 'transport-1',
  iceParameters: { usernameFragment: 'user', password: 'pass' },
  iceCandidates: [],
  dtlsParameters: { fingerprints: [], role: 'auto' as const },
};

describe('SfuManager', () => {
  let manager: SfuManager;

  beforeEach(() => {
    testContext.reset();
    manager = new SfuManager();
  });

  afterEach(() => {
    manager.disconnect();
  });

  it('loads the device and requests transports after joining the SFU room', async () => {
    const stateCallback = vi.fn();
    manager.onStateChange(stateCallback);

    manager.connect();

    testContext.mockSocket.connected = true;
    await testContext.emitSocketEvent('connect');
    await testContext.emitSocketEvent('sfu:joined', {
      routerRtpCapabilities: { codecs: [] },
    });

    await waitFor(() => {
      expect(testContext.mockDeviceLoad).toHaveBeenCalledWith({
        routerRtpCapabilities: { codecs: [] },
      });
    });

    expect(testContext.mockSocket.emit).toHaveBeenCalledWith('sfu:create-send-transport');
    expect(testContext.mockSocket.emit).toHaveBeenCalledWith('sfu:create-recv-transport');
    expect(stateCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionState: 'connected',
        isDeviceLoaded: true,
      })
    );
  });

  it('consumes a remote producer and notifies track subscribers', async () => {
    const onPeerJoined = vi.fn();
    const onTrack = vi.fn();

    manager.onPeerJoined(onPeerJoined);
    manager.onTrack(onTrack);
    manager.connect();

    testContext.mockSocket.connected = true;
    await testContext.emitSocketEvent('connect');
    await testContext.emitSocketEvent('sfu:joined', {
      routerRtpCapabilities: { codecs: [] },
    });
    await testContext.emitSocketEvent('sfu:transport-created', {
      ...transportPayload,
      direction: 'recv',
      transportId: 'recv-transport',
    });

    await testContext.emitSocketEvent('sfu:new-producer', {
      producerId: 'producer-remote',
      userId: 'user-2',
      username: 'bob',
      kind: 'video',
    });

    expect(onPeerJoined).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
        username: 'bob',
      })
    );
    expect(testContext.mockSocket.emit).toHaveBeenCalledWith('sfu:consume', {
      producerId: 'producer-remote',
      rtpCapabilities: { codecs: ['vp8'] },
    });

    await testContext.emitSocketEvent('sfu:consumer-created', {
      consumerId: 'consumer-1',
      producerId: 'producer-remote',
      kind: 'video',
      rtpParameters: { codecs: [] },
    });

    expect(testContext.mockRecvTransport.consume).toHaveBeenCalledWith({
      id: 'consumer-1',
      producerId: 'producer-remote',
      kind: 'video',
      rtpParameters: { codecs: [] },
    });
    expect(testContext.mockSocket.emit).toHaveBeenCalledWith('sfu:resume-consumer', {
      consumerId: 'consumer-1',
    });
    expect(onTrack).toHaveBeenCalledWith(testContext.mockConsumerTrack, 'video', 'user-2');
  });

  it('produces a local track and replaces it through the matching producer', async () => {
    manager.connect();

    testContext.mockSocket.connected = true;
    await testContext.emitSocketEvent('connect');
    await testContext.emitSocketEvent('sfu:joined', {
      routerRtpCapabilities: { codecs: [] },
    });
    await testContext.emitSocketEvent('sfu:transport-created', {
      ...transportPayload,
      direction: 'send',
      transportId: 'send-transport',
    });

    const originalTrack = { kind: 'video' } as MediaStreamTrack;
    const nextTrack = { kind: 'video' } as MediaStreamTrack;

    await manager.produce(originalTrack);
    const replaced = await manager.replaceTrack('video', nextTrack);

    expect(testContext.mockSendTransport.produce).toHaveBeenCalledWith(
      expect.objectContaining({ track: originalTrack })
    );
    expect(replaced).toBe(true);
    expect(testContext.mockProducer.replaceTrack).toHaveBeenCalledWith({ track: nextTrack });
  });
});