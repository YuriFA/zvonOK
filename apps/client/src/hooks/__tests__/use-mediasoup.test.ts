import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SfuState } from '@/lib/sfu/types';

class MockMediaStream {
  private tracks: MediaStreamTrack[];

  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = [...tracks];
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track);
  }

  getTracks(): MediaStreamTrack[] {
    return [...this.tracks];
  }

  getVideoTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'video');
  }

  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'audio');
  }
}

vi.stubGlobal('MediaStream', MockMediaStream);

const testContext = vi.hoisted(() => ({
  baseState: {
    connectionState: 'disconnected',
    isDeviceLoaded: false,
    sendTransportConnected: false,
    recvTransportConnected: false,
    audioProducerId: null,
    videoProducerId: null,
  } as SfuState,
}));

const mockUseAuth = vi.hoisted(() => vi.fn());
const sfuMock = vi.hoisted(() => {
  const { baseState } = testContext;
  let currentState = { ...baseState };
  const stateListeners = new Set<(state: typeof baseState) => void>();
  const trackListeners = new Set<(track: MediaStreamTrack, kind: 'audio' | 'video', userId: string) => void>();
  const peerJoinedListeners = new Set<(peer: { userId: string; username: string; producers: Map<string, { kind: 'audio' | 'video' }> }) => void>();
  const peerLeftListeners = new Set<(userId: string) => void>();
  const kickedListeners = new Set<(payload: { roomId: string }) => void>();

  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    leaveRoom: vi.fn(),
    kickPeer: vi.fn(),
    joinRoom: vi.fn().mockResolvedValue(undefined),
    produce: vi.fn().mockImplementation(async (track: MediaStreamTrack) => ({
      id: `${track.kind}-producer`,
      kind: track.kind,
    })),
    pauseProducer: vi.fn(),
    resumeProducer: vi.fn(),
    replaceTrack: vi.fn().mockResolvedValue(true),
    getProducerByKind: vi.fn(),
    getState: vi.fn(() => currentState),
    onStateChange: vi.fn((callback: (state: typeof baseState) => void) => {
      stateListeners.add(callback);
      callback(currentState);
      return () => stateListeners.delete(callback);
    }),
    onTrack: vi.fn((callback: (track: MediaStreamTrack, kind: 'audio' | 'video', userId: string) => void) => {
      trackListeners.add(callback);
      return () => trackListeners.delete(callback);
    }),
    onPeerJoined: vi.fn((callback: (peer: { userId: string; username: string; producers: Map<string, { kind: 'audio' | 'video' }> }) => void) => {
      peerJoinedListeners.add(callback);
      return () => peerJoinedListeners.delete(callback);
    }),
    onPeerLeft: vi.fn((callback: (userId: string) => void) => {
      peerLeftListeners.add(callback);
      return () => peerLeftListeners.delete(callback);
    }),
    onKicked: vi.fn((callback: (payload: { roomId: string }) => void) => {
      kickedListeners.add(callback);
      return () => kickedListeners.delete(callback);
    }),
    emitState(state: typeof baseState) {
      currentState = state;
      stateListeners.forEach((callback) => {
        callback(state);
      });
    },
    emitTrack(track: MediaStreamTrack, kind: 'audio' | 'video', userId: string) {
      trackListeners.forEach((callback) => {
        callback(track, kind, userId);
      });
    },
    emitPeerJoined(peer: { userId: string; username: string; producers: Map<string, { kind: 'audio' | 'video' }> }) {
      peerJoinedListeners.forEach((callback) => {
        callback(peer);
      });
    },
    emitPeerLeft(userId: string) {
      peerLeftListeners.forEach((callback) => {
        callback(userId);
      });
    },
    emitKicked(payload: { roomId: string }) {
      kickedListeners.forEach((callback) => {
        callback(payload);
      });
    },
    reset() {
      currentState = { ...baseState };
      stateListeners.clear();
      trackListeners.clear();
      peerJoinedListeners.clear();
      peerLeftListeners.clear();
      kickedListeners.clear();
      this.connect.mockClear();
      this.disconnect.mockClear();
      this.leaveRoom.mockClear();
      this.kickPeer.mockClear();
      this.joinRoom.mockClear();
      this.produce.mockClear();
      this.pauseProducer.mockClear();
      this.resumeProducer.mockClear();
      this.replaceTrack.mockClear();
      this.getProducerByKind.mockReset();
      this.getState.mockImplementation(() => currentState);
      this.onStateChange.mockClear();
      this.onTrack.mockClear();
      this.onPeerJoined.mockClear();
      this.onPeerLeft.mockClear();
      this.onKicked.mockClear();
    },
  };
});

vi.mock('@/features/auth/contexts/auth.context', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@/lib/sfu/manager', () => ({
  sfuManager: sfuMock,
}));

import { useMediasoup } from '../use-mediasoup';

const createTrack = (id: string, kind: 'audio' | 'video') => ({
  id,
  kind,
  enabled: true,
  onmute: null,
  onunmute: null,
  onended: null,
}) as unknown as MediaStreamTrack;

describe('useMediasoup', () => {
  const { baseState } = testContext;

  beforeEach(() => {
    sfuMock.reset();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        username: 'alice',
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('connects, joins the room, and produces local tracks after send transport is ready', async () => {
    const videoTrack = createTrack('video-1', 'video');
    const audioTrack = createTrack('audio-1', 'audio');
    const localStream = new MockMediaStream([videoTrack, audioTrack]) as unknown as MediaStream;

    renderHook(() => useMediasoup({ roomId: 'room-1', localStream, enabled: true }));

    expect(sfuMock.connect).toHaveBeenCalled();

    act(() => {
      sfuMock.emitState({
        ...baseState,
        connectionState: 'connected',
      });
    });

    await waitFor(() => {
      expect(sfuMock.joinRoom).toHaveBeenCalledWith({
        roomId: 'room-1',
        userId: 'user-1',
        username: 'alice',
      });
    });

    act(() => {
      sfuMock.emitState({
        ...baseState,
        connectionState: 'connected',
        isSendTransportCreated: true,
      });
    });

    await waitFor(() => {
      expect(sfuMock.produce).toHaveBeenCalledTimes(2);
    });

    expect(sfuMock.produce).toHaveBeenCalledWith(videoTrack);
    expect(sfuMock.produce).toHaveBeenCalledWith(audioTrack);
  });

  it('collects remote peer media and removes it when the peer leaves', async () => {
    const { result } = renderHook(() =>
      useMediasoup({ roomId: 'room-1', localStream: null, enabled: true })
    );

    act(() => {
      sfuMock.emitPeerJoined({
        userId: 'user-2',
        username: 'bob',
        producers: new Map(),
      });
    });

    const videoTrack = createTrack('remote-video', 'video');
    const audioTrack = createTrack('remote-audio', 'audio');

    act(() => {
      sfuMock.emitTrack(videoTrack, 'video', 'user-2');
      sfuMock.emitTrack(audioTrack, 'audio', 'user-2');
    });

    await waitFor(() => {
      expect(result.current.remotePeers).toHaveLength(1);
    });

    expect(result.current.remotePeers[0]?.username).toBe('bob');
    expect(result.current.remotePeers[0]?.stream.getTracks()).toHaveLength(2);

    act(() => {
      sfuMock.emitPeerLeft('user-2');
    });

    await waitFor(() => {
      expect(result.current.remotePeers).toHaveLength(0);
    });
  });

  it('synchronizes producer pause and resume actions', () => {
    const { result } = renderHook(() =>
      useMediasoup({ roomId: 'room-1', localStream: null, enabled: true })
    );

    sfuMock.getProducerByKind.mockReturnValueOnce({ id: 'audio-producer' });

    act(() => {
      result.current.syncProducerState('audio', false);
    });

    expect(sfuMock.pauseProducer).toHaveBeenCalledWith('audio-producer');

    sfuMock.getProducerByKind.mockReturnValueOnce({ id: 'video-producer' });

    act(() => {
      result.current.syncProducerState('video', true);
    });

    expect(sfuMock.resumeProducer).toHaveBeenCalledWith('video-producer');
  });
});