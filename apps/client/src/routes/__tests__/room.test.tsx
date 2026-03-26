import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CaptureState } from '@/lib/media/capture-state';

const mockUseRoom = vi.hoisted(() => vi.fn());
const mockUseEndRoom = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockManagerStart = vi.hoisted(() => vi.fn());
const mockManagerStop = vi.hoisted(() => vi.fn());
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

vi.mock('@/lib/media/manager-factory', () => ({
  createMediaManager: () => ({
    start: mockManagerStart,
    stop: mockManagerStop,
    getVideoState: () => CaptureState.ACTIVE,
    getAudioState: () => CaptureState.ACTIVE,
    getCombinedStream: () => ({ id: 'local-stream' } as unknown as MediaStream),
    onCombinedStreamChange: vi.fn(() => () => {}),
    onTrackChange: vi.fn(() => () => {}),
    enumerateDevices: vi.fn(async () => []),
    getDeviceService: () => ({
      getUserMedia: vi.fn(),
      enumerateDevices: vi.fn(),
      queryPermission: vi.fn(),
    }),
    onVideoStateChange: vi.fn(() => () => {}),
    onAudioStateChange: vi.fn(() => () => {}),
    videoCapture: {
      getState: () => CaptureState.ACTIVE,
      getTrack: () => ({ kind: 'video' }) as MediaStreamTrack,
      onStateChange: vi.fn(() => () => {}),
      start: vi.fn(),
      stop: vi.fn(),
      switchDevice: vi.fn(),
      toggle: vi.fn(),
    },
    audioCapture: {
      getState: () => CaptureState.ACTIVE,
      getTrack: () => ({ kind: 'audio' }) as MediaStreamTrack,
      onStateChange: vi.fn(() => () => {}),
      start: vi.fn(),
      stop: vi.fn(),
      switchDevice: vi.fn(),
      toggle: vi.fn(),
    },
  }),
}));

vi.mock('@/features/media/contexts/media-manager.context', () => ({
  useVideoCaptureState: () => ({ getState: () => CaptureState.ACTIVE, onStateChange: vi.fn(() => () => {}) }),
  useAudioCaptureState: () => ({ getState: () => CaptureState.ACTIVE, onStateChange: vi.fn(() => () => {}) }),
  useVideoCaptureControl: () => ({ toggle: vi.fn(), switchDevice: vi.fn() }),
  useAudioCaptureControl: () => ({ toggle: vi.fn(), switchDevice: vi.fn() }),
  useCaptureTrackProvider: () => ({ getTrack: () => null, onStateChange: vi.fn(() => () => {}) }),
  useDeviceService: () => ({
    getUserMedia: vi.fn(),
    enumerateDevices: vi.fn(),
    queryPermission: vi.fn(),
  }),
  useMediaManagerDirect: () => ({
    start: mockManagerStart,
    stop: mockManagerStop,
    getVideoState: () => CaptureState.ACTIVE,
    getAudioState: () => CaptureState.ACTIVE,
    getCombinedStream: () => ({ id: 'local-stream' } as unknown as MediaStream),
    onCombinedStreamChange: vi.fn(() => () => {}),
    onVideoStateChange: vi.fn(() => () => {}),
    onAudioStateChange: vi.fn(() => () => {}),
    videoCapture: { getState: () => CaptureState.ACTIVE },
    audioCapture: { getState: () => CaptureState.ACTIVE },
  }),
  MediaManagerProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockOnRoomEnded = vi.hoisted(() => vi.fn(() => () => {}));

vi.mock('@/lib/sfu/manager', () => ({
  sfuManager: {
    onRoomEnded: mockOnRoomEnded,
  },
}));

vi.mock('@/features/sfu/contexts/sfu-manager.context', () => ({
  useSfuManager: () => ({
    getProducerByKind: () => undefined,
    replaceTrack: vi.fn(),
  }),
  SfuManagerProvider: ({ children }: { children: React.ReactNode }) => children,
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

vi.mock('@/features/media/hooks/use-sfu-track-sync', () => ({
  useSfuTrackSync: () => {},
}));

vi.mock('@/features/media/hooks/use-media-controls', () => ({
  useMediaControls: () => ({
    isVideoEnabled: true,
    isAudioEnabled: true,
    videoCaptureState: CaptureState.ACTIVE,
    audioCaptureState: CaptureState.ACTIVE,
    setVideoEnabled: mockSetVideoEnabled,
    setAudioEnabled: mockSetAudioEnabled,
  }),
}));

import { RoomPage } from '../room';

const room = {
  id: 'room-1',
  slug: 'alpha',
  name: 'Alpha Room',
  ownerId: 'user-1',
  maxParticipants: 6,
  status: 'active' as const,
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
    mockManagerStart.mockResolvedValue(undefined);
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
        videoCaptureState: CaptureState.ACTIVE,
        audioCaptureState: CaptureState.ACTIVE,
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
      expect(mockManagerStart).toHaveBeenCalled();
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
      expect(mockManagerStart).toHaveBeenCalled();
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
      expect(mockManagerStart).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kick bob' }));
    });

    expect(mockKickPeer).toHaveBeenCalledWith('user-2');
  });

  it('shows the ended state when the room status is ended', () => {
    mockUseRoom.mockReturnValue({
      data: { ...room, status: 'ended', endedAt: '2026-03-12T01:00:00.000Z' },
      isLoading: false,
      error: null,
    });

    renderRoomPage();

    expect(screen.getByText('Call Ended')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/');
    expect(screen.queryByText('Join Room')).not.toBeInTheDocument();
    expect(screen.queryByTestId('device-selector')).not.toBeInTheDocument();
  });
});
