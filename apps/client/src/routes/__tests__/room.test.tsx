import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseRoom = vi.hoisted(() => vi.fn());
const mockUseEndRoom = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockStartStreamWithFallback = vi.hoisted(() => vi.fn());
const mockStopStream = vi.hoisted(() => vi.fn());
const mockGetVideoDeviceId = vi.hoisted(() => vi.fn());
const mockGetAudioDeviceId = vi.hoisted(() => vi.fn());
const mockSetSelectedVideoDeviceId = vi.hoisted(() => vi.fn());
const mockSetSelectedAudioDeviceId = vi.hoisted(() => vi.fn());
const mockHasVideoTrack = vi.hoisted(() => vi.fn());
const mockHasAudioTrack = vi.hoisted(() => vi.fn());
const mockUseMediaControls = vi.hoisted(() => vi.fn());
const mockUseMediasoup = vi.hoisted(() => vi.fn());
const mockKickPeer = vi.hoisted(() => vi.fn());
const mockToggleVideoWithHardware = vi.hoisted(() => vi.fn());
const mockToggleAudioWithHardware = vi.hoisted(() => vi.fn());
const mockSetVideoEnabled = vi.hoisted(() => vi.fn());
const mockSetAudioEnabled = vi.hoisted(() => vi.fn());
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
    getVideoDeviceId: mockGetVideoDeviceId,
    getAudioDeviceId: mockGetAudioDeviceId,
    setSelectedVideoDeviceId: mockSetSelectedVideoDeviceId,
    setSelectedAudioDeviceId: mockSetSelectedAudioDeviceId,
    hasVideoTrack: mockHasVideoTrack,
    hasAudioTrack: mockHasAudioTrack,
  },
}));

vi.mock('@/features/media/hooks/use-media-controls', () => ({
  useMediaControls: mockUseMediaControls,
}));

vi.mock('@/hooks/use-mediasoup', () => ({
  useMediasoup: mockUseMediasoup,
}));

vi.mock('@/components/local-video', () => ({
  LocalVideo: ({ stream }: { stream: MediaStream | null }) => (
    <div data-testid="local-video">{stream ? 'local-stream-ready' : 'local-stream-missing'}</div>
  ),
}));

vi.mock('@/components/remote-video', () => ({
  RemoteVideo: ({ username }: { username?: string }) => <div>{username ?? 'remote-video'}</div>,
}));

vi.mock('@/features/media/components/device-selector', () => ({
  DeviceSelector: () => <div data-testid="device-selector">device-selector</div>,
}));

vi.mock('@/features/media/components/device-settings-panel', () => ({
  DeviceSettingsPanel: () => <div data-testid="device-settings-panel">settings</div>,
}));

vi.mock('@/hooks/use-quality-stats', () => ({
  useQualityStats: mockUseQualityStats,
}));

vi.mock('@/features/room/hooks/use-active-speaker', () => ({
  useActiveSpeaker: mockUseActiveSpeaker,
}));

import { RoomPage } from '../room';

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
  const toggleAudio = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

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
        username: 'alice',
      },
    });
    mockGetVideoDeviceId.mockReturnValue('camera-1');
    mockGetAudioDeviceId.mockReturnValue('microphone-1');
    mockHasVideoTrack.mockReturnValue(true);
    mockHasAudioTrack.mockReturnValue(true);
    mockStartStreamWithFallback.mockResolvedValue({
      stream: { id: 'local-stream' } as MediaStream,
      isAudioOnly: false,
      videoError: null,
    });
    mockUseMediaControls.mockReturnValue({
      isVideoEnabled: true,
      isAudioEnabled: true,
      isVideoAvailable: true,
      isAudioAvailable: true,
      toggleAudio,
      setVideoEnabled: mockSetVideoEnabled,
      setAudioEnabled: mockSetAudioEnabled,
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
          stream: { id: 'remote-stream' } as MediaStream,
          isVideoEnabled: true,
          isAudioEnabled: true,
        },
      ],
      toggleVideoWithHardware: mockToggleVideoWithHardware,
      toggleAudioWithHardware: mockToggleAudioWithHardware,
      kickPeer: mockKickPeer,
      wasKicked: false,
    });
    mockToggleVideoWithHardware.mockResolvedValue(true);
    mockToggleAudioWithHardware.mockResolvedValue(true);
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
        stream: { id: 'local-stream' } as MediaStream,
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
    renderRoomPage();

    expect(screen.getByText('Alpha Room')).toBeInTheDocument();
    expect(screen.getByText('Code: alpha')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Join Room' }));
    });

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /participants/i })).toHaveTextContent('2');

    await waitFor(() => {
      expect(mockStartStreamWithFallback).toHaveBeenCalled();
    });

    expect(mockSetSelectedVideoDeviceId).toHaveBeenCalledWith('camera-1');
    expect(mockSetSelectedAudioDeviceId).toHaveBeenCalledWith('microphone-1');

    expect(screen.getAllByText('bob')).toHaveLength(2);
    expect(await screen.findByTestId('local-video')).toHaveTextContent('local-stream-ready');
  });

  it('syncs media control actions with SFU producers and lets the owner end the room', async () => {
    renderRoomPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Join Room' }));
    });

    await waitFor(() => {
      expect(mockStartStreamWithFallback).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.click(screen.getByTitle('Turn off camera'));
      fireEvent.click(screen.getByTitle('Mute microphone'));
      fireEvent.click(screen.getByRole('button', { name: 'End Room' }));
    });

    expect(mockSetVideoEnabled).toHaveBeenCalledWith(false);
    expect(mockToggleVideoWithHardware).toHaveBeenCalledWith(false);
    expect(mockSetAudioEnabled).toHaveBeenCalledWith(false);
    expect(mockToggleAudioWithHardware).toHaveBeenCalledWith(false);
    expect(mutate).toHaveBeenCalledWith('room-1');
  });

  it('allows the room owner to kick a remote participant from the participants list', async () => {
    renderRoomPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Join Room' }));
    });

    await waitFor(() => {
      expect(mockStartStreamWithFallback).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kick bob' }));
    });

    expect(mockKickPeer).toHaveBeenCalledWith('user-2');
  });
});