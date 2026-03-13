import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseRoom = vi.hoisted(() => vi.fn());
const mockUseEndRoom = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockStartStreamWithFallback = vi.hoisted(() => vi.fn());
const mockStopStream = vi.hoisted(() => vi.fn());
const mockGetStream = vi.hoisted(() => vi.fn());
const mockGetVideoDeviceId = vi.hoisted(() => vi.fn());
const mockGetAudioDeviceId = vi.hoisted(() => vi.fn());
const mockIsAudioOnly = vi.hoisted(() => vi.fn());
const mockGetVideoUnavailableReason = vi.hoisted(() => vi.fn());
const mockManagerToggleVideo = vi.hoisted(() => vi.fn());
const mockManagerToggleAudio = vi.hoisted(() => vi.fn());
const mockUseMediaControls = vi.hoisted(() => vi.fn());
const mockUseMediaPermissions = vi.hoisted(() => vi.fn());
const mockUseMediaDevices = vi.hoisted(() => vi.fn());
const mockUseMediasoup = vi.hoisted(() => vi.fn());
const mockKickPeer = vi.hoisted(() => vi.fn());
const mockUseQualityStats = vi.hoisted(() => vi.fn());
const mockUseActiveSpeaker = vi.hoisted(() => vi.fn());

vi.mock('@/features/room/hooks/use-room', () => ({
  useRoom: mockUseRoom,
}));

vi.mock('@/features/room/hooks/use-end-room', () => ({
  useEndRoom: mockUseEndRoom,
}));

vi.mock('@/features/auth/contexts/auth.context', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@/lib/media/manager', () => ({
  mediaManager: {
    startStreamWithFallback: mockStartStreamWithFallback,
    stopStream: mockStopStream,
    getStream: mockGetStream,
    getVideoDeviceId: mockGetVideoDeviceId,
    getAudioDeviceId: mockGetAudioDeviceId,
    isAudioOnly: mockIsAudioOnly,
    getVideoUnavailableReason: mockGetVideoUnavailableReason,
    toggleVideo: mockManagerToggleVideo,
    toggleAudio: mockManagerToggleAudio,
  },
}));

vi.mock('@/features/media/hooks/use-media-controls', () => ({
  useMediaControls: mockUseMediaControls,
}));

vi.mock('@/features/media/hooks/use-media-permissions', () => ({
  useMediaPermissions: mockUseMediaPermissions,
}));

vi.mock('@/features/media/hooks/use-media-devices', () => ({
  useMediaDevices: mockUseMediaDevices,
}));

vi.mock('@/hooks/use-mediasoup', () => ({
  useMediasoup: mockUseMediasoup,
}));

vi.mock('@/hooks/use-quality-stats', () => ({
  useQualityStats: mockUseQualityStats,
}));

vi.mock('@/features/room/hooks/use-active-speaker', () => ({
  useActiveSpeaker: mockUseActiveSpeaker,
}));

vi.mock('@/components/local-video', () => ({
  LocalVideo: ({ stream }: { stream: MediaStream | null }) => (
    <div data-testid="local-video">{stream ? 'local-stream-ready' : 'local-stream-missing'}</div>
  ),
}));

vi.mock('@/components/remote-video', () => ({
  RemoteVideo: ({ username }: { username?: string }) => <div>{username ?? 'remote-video'}</div>,
}));

vi.mock('@/features/media/components/device-settings-panel', () => ({
  DeviceSettingsPanel: () => <div data-testid="device-settings-panel">settings</div>,
}));

import { RoomPage } from '../room';

function createMockStream(id: string): MediaStream {
  return {
    id,
    getTracks: () => [],
    getVideoTracks: () => [],
    getAudioTracks: () => [],
  } as unknown as MediaStream;
}

const room = {
  id: 'room-1',
  slug: 'alpha',
  name: 'Alpha Room',
  ownerId: 'user-1',
  maxParticipants: 6,
  createdAt: '2026-03-12T00:00:00.000Z',
};

describe('RoomPage', () => {
  const mutate = vi.fn();
  const toggleVideo = vi.fn();
  const toggleAudio = vi.fn();
  const syncProducerState = vi.fn();
  let currentStream: MediaStream | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    currentStream = null;

    mockUseRoom.mockReturnValue({
      data: room,
      isLoading: false,
      error: null,
    });
    mockUseEndRoom.mockReturnValue({
      mutate,
      isPending: false,
      error: null,
    });
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
      },
    });
    mockStartStreamWithFallback.mockImplementation(async () => {
      currentStream = createMockStream('local-stream');
      return {
        stream: currentStream,
        isAudioOnly: false,
        videoError: null,
      };
    });
    mockStopStream.mockImplementation(() => {
      currentStream = null;
    });
    mockGetStream.mockImplementation(() => currentStream);
    mockGetVideoDeviceId.mockReturnValue(null);
    mockGetAudioDeviceId.mockReturnValue(null);
    mockIsAudioOnly.mockReturnValue(false);
    mockGetVideoUnavailableReason.mockReturnValue(null);
    mockUseMediaControls.mockReturnValue({
      isVideoEnabled: true,
      isAudioEnabled: true,
      toggleVideo,
      toggleAudio,
    });
    mockUseMediaPermissions.mockImplementation((options?: { preserveStreamOnUnmountRef?: { current: boolean } }) => ({
      permissionStatus: null,
      isChecking: false,
      checkPermissions: vi.fn(),
      startMedia: mockStartStreamWithFallback,
      stopMedia: () => {
        if (options?.preserveStreamOnUnmountRef?.current) {
          return;
        }
        mockStopStream();
      },
      isAudioOnly: false,
      videoUnavailableReason: null,
      stream: currentStream,
      error: null,
      isLoading: false,
      retry: vi.fn(),
    }));
    mockUseMediaDevices.mockReturnValue({
      selectedDevices: {
        videoDeviceId: null,
        audioDeviceId: null,
        speakerDeviceId: null,
      },
    });
    mockUseMediasoup.mockReturnValue({
      state: {
        connectionState: 'connected',
        isDeviceLoaded: true,
        sendTransportConnected: true,
        recvTransportConnected: true,
        audioProducerId: 'audio-producer',
        videoProducerId: 'video-producer',
      },
      remotePeers: [
        {
          userId: 'user-2',
          username: 'bob',
          stream: { id: 'remote-stream' },
          isVideoEnabled: true,
          isAudioEnabled: true,
        },
      ],
      syncProducerState,
      kickPeer: mockKickPeer,
      wasKicked: false,
    });
    mockUseQualityStats.mockReturnValue({
      peerStats: new Map(),
    });
    mockUseActiveSpeaker.mockReturnValue(null);
  });

  const renderRoomPage = () =>
    render(
      <MemoryRouter initialEntries={[`/room/${room.slug}`]}>
        <Routes>
          <Route path="/room/:slug" element={<RoomPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('waits for media initialization before enabling the SFU connection', async () => {
    let resolveStartStream: ((value: {
      stream: MediaStream;
      isAudioOnly: boolean;
      videoError: null;
    }) => void) | null = null;

    mockStartStreamWithFallback.mockImplementation(
      () => new Promise((resolve) => {
        resolveStartStream = resolve;
      })
    );

    renderRoomPage();

    expect(mockUseMediasoup).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Join Room' }));
    });

    await act(async () => {
      resolveStartStream?.({
        stream: createMockStream('local-stream'),
        isAudioOnly: false,
        videoError: null,
      });
    });

    await waitFor(() => {
      expect(mockUseMediasoup).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabled: true,
        })
      );
    });
  });

  it('renders room details, starts media, and shows remote SFU peers', async () => {
    await act(async () => {
      renderRoomPage();
    });

    expect(screen.getByText('Alpha Room')).toBeInTheDocument();
    expect(screen.getByText('Code: alpha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join Room' })).toBeInTheDocument();

    await waitFor(() => {
      expect(mockStartStreamWithFallback).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Join Room' }));
    });

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /participants/i })).toHaveTextContent('2');
    expect(screen.getAllByText('bob')).toHaveLength(2);
    expect(await screen.findByTestId('local-video')).toHaveTextContent('local-stream-ready');
  });

  it('syncs media control actions with SFU producers and lets the owner end the room', async () => {
    renderRoomPage();

    await waitFor(() => {
      expect(mockStartStreamWithFallback).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Join Room' }));
    });

    await act(async () => {
      fireEvent.click(screen.getByTitle('Turn off camera'));
      fireEvent.click(screen.getByTitle('Mute microphone'));
      fireEvent.click(screen.getByRole('button', { name: 'End Room' }));
    });

    expect(toggleVideo).toHaveBeenCalled();
    expect(toggleAudio).toHaveBeenCalled();
    expect(syncProducerState).toHaveBeenCalledWith('video', false);
    expect(syncProducerState).toHaveBeenCalledWith('audio', false);
    expect(mutate).toHaveBeenCalledWith('room-1');
  });

  it('allows the room owner to kick a remote participant from the participants list', async () => {
    renderRoomPage();

    await waitFor(() => {
      expect(mockStartStreamWithFallback).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Join Room' }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kick bob' }));
    });

    expect(mockKickPeer).toHaveBeenCalledWith('user-2');
  });

  it('reuses the preview stream on join and reapplies persisted mute state', async () => {
    mockUseMediaControls.mockReturnValue({
      isVideoEnabled: false,
      isAudioEnabled: false,
      toggleVideo,
      toggleAudio,
    });

    renderRoomPage();

    await waitFor(() => {
      expect(mockStartStreamWithFallback).toHaveBeenCalled();
    });

    const preJoinCallCount = mockStartStreamWithFallback.mock.calls.length;

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Join Room' }));
    });

    await waitFor(() => {
      expect(mockStartStreamWithFallback).toHaveBeenCalledTimes(preJoinCallCount);
      expect(mockManagerToggleVideo).toHaveBeenCalledWith(false);
      expect(mockManagerToggleAudio).toHaveBeenCalledWith(false);
    });
  });
});