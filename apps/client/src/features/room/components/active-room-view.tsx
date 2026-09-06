import { computeLayout } from "@zvonok/video-layout";
import { Lock, LockOpen, MessageSquare, MicOff, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ParticipantsList } from "@/components/room/participants-list";
import { Button } from "@/components/ui/button";
import { VideoGrid } from "@/components/video-grid";
import { ChatPanel } from "@/features/chat/components/chat-panel";
import { useChat } from "@/features/chat/hooks/use-chat";
import { useCallRecording } from "@/features/media/hooks/use-call-recording";
import { RoomCenterControls } from "@/features/room/components/room-center-controls";
import { RoomVideo } from "@/features/room/components/room-video";
import { ScreenShareSpotlight } from "@/features/room/components/screen-share-spotlight";
import { useKeyboardShortcuts } from "@/features/room/hooks/use-keyboard-shortcuts";
import type { UseRoomSessionResult } from "@/features/room/hooks/use-room-session";
import { WhiteboardPanel } from "@/features/whiteboard/components/whiteboard-panel";
import { useWhiteboard } from "@/features/whiteboard/hooks/use-whiteboard";
import type { ScreenShareError } from "@/hooks/use-screen-share";
import { useScreenShare } from "@/hooks/use-screen-share";

import { useGuestRequests } from "../contexts/guest-requests.context";
import type { Room } from "../types/room.types";
import { AsidePanel, AsidePanelContainer, AsidePanelHeader } from "./aside-panel";
import { RoomLeftControls } from "./room-left-controls";
import { RoomRightControls } from "./room-right-controls";

interface ActiveScreenShare {
  userId: string;
  sharerName: string;
  stream: MediaStream;
  isLocal: boolean;
}

interface ActiveRoomViewProps {
  session: UseRoomSessionResult;
  room: Room;
  currentUserId: string | undefined;
  currentUsername: string | undefined;
}

export function ActiveRoomView({
  session,
  room,
  currentUserId,
  currentUsername,
}: ActiveRoomViewProps) {
  const {
    localVideoStream,
    localAudioStream,
    mediaControls,
    toggleVideo,
    toggleAudio,
    remotePeers,
    localUserId,
    participants,
    kickPeer,
    isRoomLocked,
    hostControls,
  } = session;

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { isSharing, screenStream, isScreenShareBlocked, startScreenShare, stopScreenShare } =
    useScreenShare();
  const [screenShareState, setScreenShareState] = useState<"idle" | "starting" | "sharing">("idle");

  const isScreenShareSupported =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function";

  // Derive the active screen share: local takes priority, then first remote sharer
  const activeScreenShare = useMemo((): ActiveScreenShare | null => {
    if (isSharing && screenStream) {
      return {
        userId: localUserId,
        sharerName: currentUsername ?? "You",
        stream: screenStream,
        isLocal: true,
      };
    }

    const remotePeer = remotePeers.find(
      (peer) => peer.isScreenSharing && peer.screenStream !== null,
    );
    if (remotePeer?.screenStream) {
      return {
        userId: remotePeer.userId,
        sharerName: remotePeer.username,
        stream: remotePeer.screenStream,
        isLocal: false,
      };
    }

    return null;
  }, [isSharing, screenStream, localUserId, currentUsername, remotePeers]);

  const isSpotlightMode = activeScreenShare !== null;

  const recorder = useCallRecording({
    roomSlug: room.slug,
    localUserId,
    localDisplayName: currentUsername ?? "You",
    localVideoStream,
    localAudioStream,
    remotePeers,
    activeScreenShare:
      activeScreenShare === null
        ? null
        : {
            userId: activeScreenShare.userId,
            label: activeScreenShare.sharerName,
            stream: activeScreenShare.stream,
          },
  });

  // Recording is possible as long as anyone in the room publishes media.
  const isRecordingEnabled =
    (localVideoStream?.getTracks() ?? []).some((track) => track.readyState === "live") ||
    (localAudioStream?.getTracks() ?? []).some((track) => track.readyState === "live") ||
    remotePeers.some((peer) => peer.isCameraEnabled || peer.isAudioEnabled || peer.isScreenSharing);

  const handleToggleRecord = () => {
    if (recorder.state === "recording") {
      recorder.stop();
    } else {
      recorder.start();
    }
  };

  const layout = useMemo(
    () =>
      computeLayout({
        containerWidth: dimensions.width,
        containerHeight: dimensions.height,
        participantCount: remotePeers.length + 1,
        spotlight: isSpotlightMode,
      }),
    [dimensions.height, dimensions.width, remotePeers.length, isSpotlightMode],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { clientWidth: width, clientHeight: height } = entry.target;
        setDimensions((prev) => {
          if (prev.width === width && prev.height === height) {
            return prev;
          }
          return { width, height };
        });
      }
    });

    observer.observe(element);

    setDimensions({
      width: element.clientWidth,
      height: element.clientHeight,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleToggleVideo = useCallback(async () => {
    await toggleVideo();
  }, [toggleVideo]);

  const handleToggleAudio = useCallback(async () => {
    await toggleAudio();
  }, [toggleAudio]);

  const [asideState, setAsideState] = useState<"participants" | "chat" | "board" | null>(null);

  const isOwner = currentUserId === room.ownerId;

  const whiteboard = useWhiteboard({
    roomSlug: room.slug,
    enabled: asideState === "board",
  });

  const handleMuteAll = useCallback(async () => {
    try {
      await hostControls.muteAll();
    } catch {
      toast.error("Could not mute everyone");
    }
  }, [hostControls]);

  const handleToggleLock = useCallback(async () => {
    try {
      await hostControls.lockRoom(!isRoomLocked);
    } catch {
      toast.error("Could not change the room lock");
    }
  }, [hostControls, isRoomLocked]);

  const handleMuteParticipant = useCallback(
    async (userId: string) => {
      try {
        await hostControls.mutePeer(userId);
      } catch {
        toast.error("Could not mute the participant");
      }
    },
    [hostControls],
  );
  const { pendingRequests, approveRequest, denyRequest } = useGuestRequests();

  const chat = useChat({
    roomId: room.id,
    currentUserId,
    enabled: true,
  });

  const handleToggleScreenShare = useCallback(async () => {
    if (isSharing) {
      stopScreenShare();
      setScreenShareState("idle");
      return;
    }

    setScreenShareState("starting");
    try {
      await startScreenShare();
      setScreenShareState("sharing");
    } catch (error) {
      const kind = error as ScreenShareError;
      setScreenShareState("idle");
      if (kind === "unsupported") {
        return;
      }
      if (kind === "blocked") {
        toast.error("Another participant is already sharing");
        return;
      }
      toast.error("Screen share was not started");
    }
  }, [isSharing, startScreenShare, stopScreenShare]);
  useKeyboardShortcuts({
    onToggleAudio: handleToggleAudio,
    onToggleVideo: handleToggleVideo,
    onToggleScreenShare: handleToggleScreenShare,
  });

  // Sync screenShareState with isSharing (auto-stop via track.ended)
  useEffect(() => {
    if (!isSharing && screenShareState === "sharing") {
      setScreenShareState("idle");
    }
  }, [isSharing, screenShareState]);

  const hasValidDimensions = dimensions.width > 0 && dimensions.height > 0;

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {isRoomLocked && (
        <div
          className="flex items-center justify-center gap-2 bg-amber-500/15 py-1.5 text-xs font-medium text-amber-600"
          role="status"
        >
          <Lock className="size-3.5" />
          Room is locked - new participants cannot join
        </div>
      )}
      <div className="relative flex min-h-0 flex-1 p-4">
        <VideoGrid ref={containerRef}>
          {hasValidDimensions && (
            <>
              {/* Screen share spotlight - rendered only in spotlight mode */}
              {isSpotlightMode && layout.spotlightArea && (
                <ScreenShareSpotlight
                  key={activeScreenShare.userId}
                  stream={activeScreenShare.stream}
                  sharerName={activeScreenShare.sharerName}
                  isLocal={activeScreenShare.isLocal}
                  style={{
                    position: "absolute",
                    top: layout.spotlightArea.y,
                    left: layout.spotlightArea.x,
                    width: layout.spotlightArea.width,
                    height: layout.spotlightArea.height,
                  }}
                />
              )}

              {/* Local participant tile */}
              <RoomVideo
                userId={localUserId}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: layout.tiles[0]?.width ?? 0,
                  height: layout.tiles[0]?.height ?? 0,
                  transform: `translateX(${layout.tiles[0]?.x ?? 0}px) translateY(${layout.tiles[0]?.y ?? 0}px)`,
                }}
                stream={localVideoStream}
                username={currentUsername}
                isVideoEnabled={mediaControls.isVideoEnabled}
                isAudioEnabled={mediaControls.isAudioEnabled}
              />

              {/* Remote participant tiles */}
              {remotePeers.map((peer, index) => (
                <RoomVideo
                  key={peer.userId}
                  userId={peer.userId}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: layout.tiles[index + 1]?.width ?? 0,
                    height: layout.tiles[index + 1]?.height ?? 0,
                    transform: `translateX(${layout.tiles[index + 1]?.x ?? 0}px) translateY(${layout.tiles[index + 1]?.y ?? 0}px)`,
                  }}
                  stream={peer.cameraStream}
                  username={peer.username}
                  isVideoEnabled={peer.isCameraEnabled}
                  isAudioEnabled={peer.isAudioEnabled}
                />
              ))}
            </>
          )}
        </VideoGrid>

        {asideState === "board" && (
          <WhiteboardPanel
            mode={whiteboard.mode}
            status={whiteboard.status}
            isOwner={isOwner}
            onEditorMount={whiteboard.handleEditorMount}
            onToggleMode={whiteboard.setBoardMode}
            onClose={() => setAsideState(null)}
          />
        )}

        <AsidePanelContainer data-state={asideState ? "open" : "closed"}>
          {asideState === "participants" && (
            <AsidePanel>
              <AsidePanelHeader onClose={() => setAsideState(null)}>
                <Users className="size-4" />
                <span>Participants</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {participants.length}
                </span>
              </AsidePanelHeader>
              {isOwner && (
                <div className="flex items-center gap-2 border-b px-3 py-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs"
                    onClick={handleMuteAll}
                  >
                    <MicOff className="size-3.5" />
                    Mute all
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs"
                    onClick={handleToggleLock}
                  >
                    {isRoomLocked ? (
                      <LockOpen className="size-3.5" />
                    ) : (
                      <Lock className="size-3.5" />
                    )}
                    {isRoomLocked ? "Unlock room" : "Lock room"}
                  </Button>
                </div>
              )}
              <ParticipantsList
                participants={participants}
                currentUserId={currentUserId}
                roomOwnerId={room.ownerId}
                onKickParticipant={kickPeer}
                onMuteParticipant={isOwner ? handleMuteParticipant : undefined}
                onApproveRequest={isOwner ? approveRequest : undefined}
                onDenyRequest={isOwner ? denyRequest : undefined}
              />
            </AsidePanel>
          )}

          {asideState === "chat" && (
            <AsidePanel>
              <AsidePanelHeader onClose={() => setAsideState(null)}>
                <MessageSquare className="size-4" />
                Chat
              </AsidePanelHeader>
              <ChatPanel
                currentUserId={currentUserId}
                messages={chat.messages}
                isLoading={chat.isLoading}
                hasMore={chat.hasMore}
                onSendMessage={chat.sendMessage}
                onLoadMore={chat.loadHistory}
              />
            </AsidePanel>
          )}
        </AsidePanelContainer>
      </div>

      <div className="flex items-center justify-between border-t p-4">
        <RoomLeftControls
          isVideoEnabled={mediaControls.isVideoEnabled}
          isAudioEnabled={mediaControls.isAudioEnabled}
          videoCaptureState={mediaControls.videoCaptureState}
          audioCaptureState={mediaControls.audioCaptureState}
          onToggleVideo={handleToggleVideo}
          onToggleAudio={handleToggleAudio}
        />

        <RoomCenterControls
          className="mx-auto"
          isScreenSharing={isSharing}
          isScreenShareSupported={isScreenShareSupported}
          isScreenShareBlocked={isScreenShareBlocked}
          screenShareState={screenShareState}
          onToggleScreenShare={handleToggleScreenShare}
          recordingState={recorder.state}
          elapsedSeconds={recorder.elapsedSeconds}
          isRecordingSupported={recorder.isSupported}
          isRecordingEnabled={isRecordingEnabled}
          onToggleRecord={handleToggleRecord}
        />
        <RoomRightControls
          pendingRequestsCount={isOwner ? pendingRequests.length : undefined}
          isParticipantsVisible={asideState === "participants"}
          onToggleParticipants={() =>
            setAsideState((v) => (v === "participants" ? null : "participants"))
          }
          isChatOpen={asideState === "chat"}
          isBoardOpen={asideState === "board"}
          onToggleBoard={() => setAsideState((v) => (v === "board" ? null : "board"))}
          onToggleChat={() => {
            setAsideState((v) => {
              const next = v === "chat" ? null : "chat";
              if (next === "chat") chat.resetUnreadCount();
              return next;
            });
          }}
          unreadCount={chat.unreadCount}
        />
      </div>
    </main>
  );
}
