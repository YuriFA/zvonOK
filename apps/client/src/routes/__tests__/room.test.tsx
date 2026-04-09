import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { CaptureState } from "@/lib/media/capture-state";

const mockUseRoom = vi.hoisted(() => vi.fn());
const mockUseEndRoom = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseRoomSession = vi.hoisted(() => vi.fn());
const mockKickPeer = vi.hoisted(() => vi.fn());
const mockToggleVideo = vi.hoisted(() => vi.fn());
const mockToggleAudio = vi.hoisted(() => vi.fn());

vi.mock("@/features/room/hooks/use-room", () => ({
  useRoom: mockUseRoom,
}));

vi.mock("@/features/room/hooks/use-end-room", () => ({
  useEndRoom: mockUseEndRoom,
}));

vi.mock("@/features/auth/contexts/auth.context", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/lib/media/manager-factory", () => ({
  createMediaManager: () => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    getVideoState: () => CaptureState.ACTIVE,
    getAudioState: () => CaptureState.ACTIVE,
    getDeviceService: () => ({
      getUserMedia: vi.fn(),
      enumerateDevices: vi.fn(),
      queryPermission: vi.fn(),
    }),
    videoCapture: {
      getState: () => CaptureState.ACTIVE,
      getTrack: () => ({ kind: "video" }) as MediaStreamTrack,
      onStateChange: vi.fn(() => () => {}),
      start: vi.fn(),
      stop: vi.fn(),
      switchDevice: vi.fn(),
      toggle: vi.fn(),
    },
    audioCapture: {
      getState: () => CaptureState.ACTIVE,
      getTrack: () => ({ kind: "audio" }) as MediaStreamTrack,
      onStateChange: vi.fn(() => () => {}),
      start: vi.fn(),
      stop: vi.fn(),
      switchDevice: vi.fn(),
      toggle: vi.fn(),
    },
  }),
}));

vi.mock("@/features/media/contexts/media-manager.context", () => ({
  useVideoCaptureState: () => ({
    getState: () => CaptureState.ACTIVE,
    onStateChange: vi.fn(() => () => {}),
  }),
  useAudioCaptureState: () => ({
    getState: () => CaptureState.ACTIVE,
    onStateChange: vi.fn(() => () => {}),
  }),
  useVideoCaptureControl: () => ({ toggle: vi.fn(), switchDevice: vi.fn() }),
  useAudioCaptureControl: () => ({ toggle: vi.fn(), switchDevice: vi.fn() }),
  useCaptureTrackProvider: () => ({ getTrack: () => null, onStateChange: vi.fn(() => () => {}) }),
  useDeviceService: () => ({
    getUserMedia: vi.fn(),
    enumerateDevices: vi.fn(),
    queryPermission: vi.fn(),
  }),
  useMediaManagerDirect: () => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    getVideoState: () => CaptureState.ACTIVE,
    getAudioState: () => CaptureState.ACTIVE,
    videoCapture: { getState: () => CaptureState.ACTIVE },
    audioCapture: { getState: () => CaptureState.ACTIVE },
  }),
  MediaManagerProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/media/contexts/media-stream.context", () => ({
  useMediaStreamContext: () => ({
    videoStream: { id: "local-video-stream" } as unknown as MediaStream,
    audioStream: { id: "local-audio-stream" } as unknown as MediaStream,
    stop: vi.fn(),
  }),
  MediaStreamProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockOnRoomEnded = vi.hoisted(() => vi.fn(() => () => {}));

vi.mock("@/lib/sfu/manager", () => ({
  sfuManager: {
    onRoomEnded: mockOnRoomEnded,
  },
}));

vi.mock("@/features/sfu/contexts/sfu-manager.context", () => ({
  useSfuManager: () => ({
    getProducerByKind: () => undefined,
    replaceTrack: vi.fn(),
    onQualityStats: () => () => {},
    onPeerLeft: () => () => {},
    startStatsCollection: vi.fn(),
    stopStatsCollection: vi.fn(),
  }),
  SfuManagerProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/room/hooks/use-room-session", () => ({
  useRoomSession: mockUseRoomSession,
}));

vi.mock("@/components/local-video", () => ({
  LocalVideo: ({ stream }: { stream: MediaStream | null }) => (
    <div data-testid="local-video">{stream ? "local-stream-ready" : "local-stream-missing"}</div>
  ),
}));

vi.mock("@/features/room/contexts/room-audio.context", () => ({
  useRoomAudioContext: () => ({
    mixer: null,
    audioElement: null,
    store: {
      getLevel: () => 0,
      getActiveSpeakerId: () => null,
      subscribeLevel: () => () => {},
      subscribeGlobal: () => () => {},
    },
  }),
  RoomAudioContextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/media/components/device-selector", () => ({
  DeviceSelector: () => <div data-testid="device-selector">device-selector</div>,
}));

vi.mock("@/features/media/components/device-settings-panel", () => ({
  DeviceSettingsPanel: () => <div data-testid="device-settings-panel">settings</div>,
}));

vi.mock("@/assets/logo.svg?react", () => ({
  default: () => null,
}));

vi.mock("@/lib/utils/display-name", () => ({
  loadGuestDisplayName: () => "Guest",
  saveGuestDisplayName: () => {},
  getAvatarColor: () => "bg-blue-500",
}));

vi.stubGlobal(
  "ResizeObserver",
  class ResizeObserver {
    observe() {
      if (this._callback) {
        this._callback([{ target: { clientWidth: 1280, clientHeight: 720 } }]);
      }
    }
    unobserve() {}
    disconnect() {}
    _callback: ((entries: unknown[]) => void) | null = null;
    constructor(callback: (entries: unknown[]) => void) {
      this._callback = callback;
    }
  },
);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

import { RoomPage } from "../room";

const room = {
  id: "room-1",
  slug: "alpha",
  name: "Alpha Room",
  ownerId: "user-1",
  maxParticipants: 6,
  status: "active" as const,
  createdAt: "2026-03-12T00:00:00.000Z",
};

describe("RoomPage", () => {
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
        id: "user-1",
        username: "alice",
      },
    });
    mockUseRoomSession.mockReturnValue({
      localVideoStream: { id: "local-video-stream" } as unknown as MediaStream,
      localAudioStream: { id: "local-audio-stream" } as unknown as MediaStream,
      mediaControls: {
        isVideoEnabled: true,
        isAudioEnabled: true,
        videoCaptureState: CaptureState.ACTIVE,
        audioCaptureState: CaptureState.ACTIVE,
        setVideoEnabled: vi.fn(),
        setAudioEnabled: vi.fn(),
      },
      toggleVideo: mockToggleVideo,
      toggleAudio: mockToggleAudio,
      sfuState: {
        connectionState: "connected",
        isDeviceLoaded: true,
        sendTransportConnected: true,
        recvTransportConnected: true,
        audioProducerId: "audio-producer",
        videoProducerId: "video-producer",
      },
      remotePeers: [
        {
          userId: "user-2",
          username: "bob",
          stream: { id: "remote-stream" } as MediaStream,
          isVideoEnabled: true,
          isAudioEnabled: true,
        },
      ],
      wasKicked: false,
      kickPeer: mockKickPeer,
      participants: [
        {
          id: "user-1",
          userId: "user-1",
          username: "alice",
          isMuted: false,
          isVideoOff: false,
          isConnected: true,
        },
        {
          id: "user-2",
          userId: "user-2",
          username: "bob",
          isMuted: false,
          isVideoOff: false,
          isConnected: true,
        },
      ],
      localUserId: "user-1",
    });
    mockToggleVideo.mockResolvedValue(undefined);
    mockToggleAudio.mockResolvedValue(undefined);
  });

  const renderRoomPage = () =>
    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={[`/room/${room.slug}`]}>
          <Routes>
            <Route path="/room/:slug" element={<RoomPage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    );

  it("renders prejoin view and transitions to active room after joining", async () => {
    renderRoomPage();

    expect(screen.getByRole("button", { name: "Join Room" })).toBeInTheDocument();
    expect(screen.getByTestId("device-selector")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join Room" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "End Room" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Turn off camera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn off microphone" })).toBeInTheDocument();
  });

  it("calls toggleVideo and toggleAudio when media control buttons are clicked", async () => {
    renderRoomPage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join Room" }));
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Turn off camera"));
      fireEvent.click(screen.getByLabelText("Turn off microphone"));
      fireEvent.click(screen.getByRole("button", { name: "End Room" }));
    });

    expect(mockToggleVideo).toHaveBeenCalled();
    expect(mockToggleAudio).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith("room-1");
  });

  it("allows the room owner to kick a remote participant from the participants list", async () => {
    renderRoomPage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join Room" }));
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Toggle participants"));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Kick bob" }));
    });

    expect(mockKickPeer).toHaveBeenCalledWith("user-2");
  });

  it("shows the ended state when the room status is ended", () => {
    mockUseRoom.mockReturnValue({
      data: { ...room, status: "ended", endedAt: "2026-03-12T01:00:00.000Z" },
      isLoading: false,
      error: null,
    });

    renderRoomPage();

    expect(screen.getByText("Call Ended")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/");
    expect(screen.queryByText("Join Room")).not.toBeInTheDocument();
    expect(screen.queryByTestId("device-selector")).not.toBeInTheDocument();
  });
});
