import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SfuEventHandlers } from '../event-router';
import { SfuEventRouter } from '../event-router';

describe('SfuEventRouter', () => {
  let handlers: SfuEventHandlers;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let socket: any;
  let getSocket: () => typeof socket | null;
  let router: SfuEventRouter;

  beforeEach(() => {
    handlers = {
      onConnected: vi.fn(),
      onDisconnected: vi.fn(),
      onJoined: vi.fn().mockResolvedValue(undefined),
      onTransportCreated: vi.fn().mockResolvedValue(undefined),
      onTransportConnected: vi.fn(),
      onProducerCreated: vi.fn(),
      onPeerJoined: vi.fn(),
      onExistingPeers: vi.fn(),
      onNewProducer: vi.fn(),
      onConsumerCreated: vi.fn().mockResolvedValue(undefined),
      onProducerStateChanged: vi.fn(),
      onPeerLeft: vi.fn(),
      onKicked: vi.fn(),
      onRoomEnded: vi.fn(),
    };

    socket = {
      on: vi.fn(),
      removeAllListeners: vi.fn(),
    };

    getSocket = () => socket;
    router = new SfuEventRouter(getSocket, handlers);
  });

  it('does nothing if socket is null on setup', () => {
    getSocket = () => null;
    router = new SfuEventRouter(getSocket, handlers);
    router.setup();
    expect(socket.on).not.toHaveBeenCalled();
  });

  it('registers all event listeners on setup', () => {
    router.setup();

    const events = socket.on.mock.calls.map((call: [string, ...unknown[]]) => call[0]);
    expect(events).toContain('connect');
    expect(events).toContain('disconnect');
    expect(events).toContain('sfu:joined');
    expect(events).toContain('sfu:transport-created');
    expect(events).toContain('sfu:transport-connected');
    expect(events).toContain('sfu:producer-created');
    expect(events).toContain('sfu:peer-joined');
    expect(events).toContain('sfu:existing-peers');
    expect(events).toContain('sfu:new-producer');
    expect(events).toContain('sfu:consumer-created');
    expect(events).toContain('sfu:peer-left');
    expect(events).toContain('sfu:producer-state-changed');
    expect(events).toContain('sfu:kicked');
    expect(events).toContain('sfu:room-ended');
    expect(events).toHaveLength(14);
  });

  it('routes connect event to onConnected', () => {
    router.setup();
    const connectHandler = socket.on.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === 'connect',
    )?.[1] as () => void;
    connectHandler();
    expect(handlers.onConnected).toHaveBeenCalled();
  });

  it('routes disconnect event to onDisconnected', () => {
    router.setup();
    const disconnectHandler = socket.on.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === 'disconnect',
    )?.[1] as () => void;
    disconnectHandler();
    expect(handlers.onDisconnected).toHaveBeenCalled();
  });

  it('routes sfu:joined event to onJoined with payload', () => {
    router.setup();
    const payload = { routerRtpCapabilities: { codecs: [] } };
    const handler = socket.on.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === 'sfu:joined',
    )?.[1] as (p: unknown) => void;
    handler(payload);
    expect(handlers.onJoined).toHaveBeenCalledWith(payload);
  });

  it('routes sfu:peer-left event to onPeerLeft', () => {
    router.setup();
    const handler = socket.on.mock.calls.find(
      (call: [string, ...unknown[]]) => call[0] === 'sfu:peer-left',
    )?.[1] as (p: unknown) => void;
    handler({ userId: 'user-1' });
    expect(handlers.onPeerLeft).toHaveBeenCalledWith({ userId: 'user-1' });
  });

  it('does nothing on teardown if socket is null', () => {
    getSocket = () => null;
    router = new SfuEventRouter(getSocket, handlers);
    router.teardown();
    expect(socket.removeAllListeners).not.toHaveBeenCalled();
  });

  it('removes all listeners on teardown', () => {
    router.setup();
    router.teardown();
    expect(socket.removeAllListeners).toHaveBeenCalled();
  });
});
