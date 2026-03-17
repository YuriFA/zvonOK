import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';

const mockUseRoom = vi.hoisted(() => vi.fn());
const mockUseEndRoom = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockStartStream = vi.hoisted(() => vi.fn());
const mockStopStream = vi.hoisted(() => vi.fn());
const mockGetVideoDeviceId = vi.hoisted(() => vi.fn());
const mockGetAudioDeviceId = vi.hoisted(() => vi.fn());
const mockSetSelectedVideoDeviceId = vi.hoisted(() => vi.fn());
const mockSetSelectedAudioDeviceId = vi.hoisted(() => vi.fn());
const mockHasVideoTrack = vi.hoisted(() => vi.fn());
const mockHasAudioTrack = vi.hoisted(() => vi.fn());
const mockIsPreferredVideoEnabled = vi.hoisted(() => vi.fn());
const mockIsPreferredAudioEnabled = vi.hoisted(() => vi.fn());
const mockUseRoomSfu = vi.hoisted(() => vi.fn());
const mockKickPeer = vi.hoisted(() => vi.fn());
const mockToggleVideo = vi.hoisted(() => vi.fn());
const mockToggleAudio = vi.hoisted(() => vi.fn());
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
    startStream: mockStartStream,
    stopStream: mockStopStream,
    getVideoDeviceId: mockGetVideoDeviceId,
    getAudioDeviceId: mockGetAudioDeviceId,
    setSelectedVideoDeviceId: mockSetSelectedVideoDeviceId,
    setSelectedAudioDeviceId: mockSetSelectedAudioDeviceId,
    hasVideoTrack: mockHasVideoTrack,
    hasAudioTrack: mockHasAudioTrack,
    isPreferredVideoEnabled: mockIsPreferredVideoEnabled,
    isPreferredAudioEnabled: mockIsPreferredAudioEnabled,
  },
}));

const mockMediaManager = {
  startStream: mockStartStream,
  stopStream: mockStopStream,
  getStream: vi.fn(() => null),
  getVideoDeviceId: mockGetVideoDeviceId,
  getAudioDeviceId: mockGetAudioDeviceId,
  setSelectedVideoDeviceId: mockSetSelectedVideoDeviceId,
  setSelectedAudioDeviceId: mockSetSelectedAudioDeviceId,
  hasVideoTrack: mockHasVideoTrack,
  hasAudioTrack: mockHasAudioTrack,
  isPreferredVideoEnabled: mockIsPreferredVideoEnabled,
  isPreferredAudioEnabled: mockIsPreferredAudioEnabled,
  onStatusChange: vi.fn(() => () => {}),
  onVideoAvailabilityChange: vi.fn(() => () => {}),
  onAudioAvailabilityChange: vi.fn(() => () => {}),
};

vi.mock('@/features/media/contexts/media-manager.context', () => ({
  useMediaManager: () => mockMediaManager,
  useMediaAcquisition: () => mockMediaManager,
  useMediaTrackController: () => mockMediaManager,
  useMediaDeviceSelector: () => mockMediaManager,
  useMediaPermissionChecker: () => mockMediaManager,
  useMediaStateNotifier: () => mockMediaManager,
  MediaManagerProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/features/room/hooks/use-room-sfu', () => ({
  useRoomSfu: mockUseRoomSfu,
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
    mockIsPreferredVideoEnabled.mockReturnValue(true);
    mockIsPreferredAudioEnabled.mockReturnValue(true);
    mockStartStream.mockResolvedValue({ id: 'local-stream' } as MediaStream);
    mockUseRoomSfu.mockReturnValue({
      sfuState: {
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
      wasKicked: false,
      kickPeer: mockKickPeer,
      mediaControls: {
        isVideoEnabled: true,
        isAudioEnabled: true,
        isVideoAvailable: true,
        isAudioAvailable: true,
        setVideoEnabled: mockSetVideoEnabled,
        setAudioEnabled: mockSetAudioEnabled,
      },
      toggleVideo: mockToggleVideo,
      toggleAudio: mockToggleAudio,
    });
    mockToggleVideo.mockResolvedValue(undefined);
    mockToggleAudio.mockResolvedValue(undefined);
    mockUseQualityStats.mockReturnValue({
      peerStats: new Map(),
    });
    mockUseActiveSpeaker.mockReturnValue(null);
  });

  const renderRoomPage = () =>
    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={[`/room/${room.slug}`]}>
          <Routes>
            <Route path="/room/:slug" element={<RoomPage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    );

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
      expect(mockStartStream).toHaveBeenCalled();
    });

    expect(screen.getAllByText('bob')).toHaveLength(2);
    expect(await screen.findByTestId('local-video')).toHaveTextContent('local-stream-ready');
  });

  it('calls toggleVideo and toggleAudio when media control buttons are clicked', async () => {
    renderRoomPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Join Room' }));
    });

    await waitFor(() => {
      expect(mockStartStream).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Turn off camera'));
      fireEvent.click(screen.getByLabelText('Mute microphone'));
      fireEvent.click(screen.getByRole('button', { name: 'End Room' }));
    });

    expect(mockToggleVideo).toHaveBeenCalled();
    expect(mockToggleAudio).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith('room-1');
  });

  it('allows the room owner to kick a remote participant from the participants list', async () => {
    renderRoomPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Join Room' }));
    });

    await waitFor(() => {
      expect(mockStartStream).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kick bob' }));
    });

    expect(mockKickPeer).toHaveBeenCalledWith('user-2');
  });

  it('joins without requesting camera when prejoin video preference is off', async () => {
    mockIsPreferredVideoEnabled.mockReturnValue(false);

    renderRoomPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Join Room' }));
    });

    await waitFor(() => {
      expect(mockStartStream).toHaveBeenCalled();
    });
  });
});
