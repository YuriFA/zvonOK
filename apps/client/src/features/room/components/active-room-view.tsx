import { computeLayout } from "@zvonok/video-layout";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ParticipantsList } from "@/components/room/participants-list";
import { VideoGrid } from "@/components/video-grid";
import { ChatPanel } from "@/features/chat/components/chat-panel";
import { useChat } from "@/features/chat/hooks/use-chat";
import { RoomCenterControls } from "@/features/room/components/room-center-controls";
import { RoomVideo } from "@/features/room/components/room-video";
import { ScreenShareSpotlight } from "@/features/room/components/screen-share-spotlight";
import type { UseRoomSessionResult } from "@/features/room/hooks/use-room-session";
import type { Room } from "@/features/room/types/room.types";
import type { ScreenShareError } from "@/hooks/use-screen-share";
import { useScreenShare } from "@/hooks/use-screen-share";
import { cn } from "@/lib/utils";

import { useGuestRequests } from "../contexts/guest-requests.context";
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
    mediaControls,
    toggleVideo,
    toggleAudio,
    remotePeers,
    localUserId,
    participants,
    kickPeer,
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

  const [isParticipantsVisible, setIsParticipantsVisible] = useState(false);

  const isOwner = currentUserId === room.ownerId;
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

  // Sync screenShareState with isSharing (auto-stop via track.ended)
  useEffect(() => {
    if (!isSharing && screenShareState === "sharing") {
      setScreenShareState("idle");
    }
  }, [isSharing, screenShareState]);

  const hasValidDimensions = dimensions.width > 0 && dimensions.height > 0;

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="relative flex min-h-0 flex-1 p-4">
        <VideoGrid ref={containerRef}>
          {hasValidDimensions && (
            <>
              {/* Screen share spotlight — rendered only in spotlight mode */}
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

        <aside
          className={cn(
            "flex-1 overflow-hidden transition-all duration-300 ease-in-out",
            isParticipantsVisible ? "ml-4 max-w-80" : "ml-0 max-w-0",
          )}
        >
          <ParticipantsList
            className="size-full"
            participants={participants}
            currentUserId={currentUserId}
            roomOwnerId={room.ownerId}
            onKickParticipant={kickPeer}
            pendingRequests={isOwner ? pendingRequests : undefined}
            onApproveRequest={isOwner ? approveRequest : undefined}
            onDenyRequest={isOwner ? denyRequest : undefined}
          />
        </aside>

        <ChatPanel
          messages={chat.messages}
          currentUserId={currentUserId}
          isOpen={chat.isOpen}
          isLoading={chat.isLoading}
          hasMore={chat.hasMore}
          onSendMessage={chat.sendMessage}
          onLoadMore={chat.loadHistory}
          onClose={() => chat.setIsOpen(false)}
        />
      </div>

      <div className="flex items-center justify-between border-t p-4">
        <RoomCenterControls
          className="mx-auto"
          isVideoEnabled={mediaControls.isVideoEnabled}
          isAudioEnabled={mediaControls.isAudioEnabled}
          videoCaptureState={mediaControls.videoCaptureState}
          audioCaptureState={mediaControls.audioCaptureState}
          onToggleVideo={handleToggleVideo}
          onToggleAudio={handleToggleAudio}
          isScreenSharing={isSharing}
          isScreenShareSupported={isScreenShareSupported}
          isScreenShareBlocked={isScreenShareBlocked}
          screenShareState={screenShareState}
          onToggleScreenShare={handleToggleScreenShare}
        />

        <RoomRightControls
          pendingRequestsCount={isOwner ? pendingRequests.length : undefined}
          isParticipantsVisible={isParticipantsVisible}
          onToggleParticipants={() => setIsParticipantsVisible((v) => !v)}
          isChatOpen={chat.isOpen}
          onToggleChat={() => chat.setIsOpen((v) => !v)}
          unreadCount={chat.unreadCount}
        />
      </div>
    </main>
  );
}
