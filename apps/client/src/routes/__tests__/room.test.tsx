import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseRoom = vi.hoisted(() => vi.fn());
const mockUseEndRoom = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockStartStreamWithFallback = vi.hoisted(() => vi.fn());
const mockStopStream = vi.hoisted(() => vi.fn());
const mockUseMediaControls = vi.hoisted(() => vi.fn());
const mockUseMediasoup = vi.hoisted(() => vi.fn());
const mockKickPeer = vi.hoisted(() => vi.fn());

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

vi.mock('@/features/media/components/device-settings-panel', () => ({
  DeviceSettingsPanel: () => <div data-testid="device-settings-panel">settings</div>,
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
  const toggleVideo = vi.fn();
  const toggleAudio = vi.fn();
  const syncProducerState = vi.fn();

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
      },
    });
    mockStartStreamWithFallback.mockResolvedValue({
      stream: { id: 'local-stream' },
      isAudioOnly: false,
      videoError: null,
    });
    mockUseMediaControls.mockReturnValue({
      isVideoEnabled: true,
      isAudioEnabled: true,
      toggleVideo,
      toggleAudio,
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
      stream: { id: string };
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
      resolveStartStream?.({
        stream: { id: 'local-stream' },
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
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /participants/i })).toHaveTextContent('2');

    await waitFor(() => {
      expect(mockStartStreamWithFallback).toHaveBeenCalled();
    });

    expect(screen.getAllByText('bob')).toHaveLength(2);
    expect(await screen.findByTestId('local-video')).toHaveTextContent('local-stream-ready');
  });

  it('syncs media control actions with SFU producers and lets the owner end the room', async () => {
    renderRoomPage();

    await waitFor(() => {
      expect(mockStartStreamWithFallback).toHaveBeenCalled();
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
      fireEvent.click(screen.getByRole('button', { name: 'Kick bob' }));
    });

    expect(mockKickPeer).toHaveBeenCalledWith('user-2');
  });
});