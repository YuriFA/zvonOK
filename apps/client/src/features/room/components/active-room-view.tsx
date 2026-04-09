import { computeLayout } from "@zvonok/video-layout";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ParticipantsList } from "@/components/room/participants-list";
import { VideoGrid } from "@/components/video-grid";
import { RoomCenterControls } from "@/features/room/components/room-center-controls";
import { RoomVideo } from "@/features/room/components/room-video";
import type { UseRoomSessionResult } from "@/features/room/hooks/use-room-session";
import type { Room } from "@/features/room/types/room.types";
import type { ScreenShareError, ScreenShareState } from "@/hooks/use-screen-share";
import { useScreenShare } from "@/hooks/use-screen-share";
import { cn } from "@/lib/utils";

import { RoomRemoteAudio } from "./room-remote-audio";
import { RoomRightControls } from "./room-right-controls";



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

  const layout = useMemo(
    () =>
      computeLayout({
        containerWidth: dimensions.width,
        containerHeight: dimensions.height,
        participantCount: remotePeers.length + 1,
      }),
    [dimensions.height, dimensions.width, remotePeers.length],
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

    // Get initial dimensions
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

  const { isSharing, startScreenShare, stopScreenShare } = useScreenShare();
  const [screenShareState, setScreenShareState] = useState<ScreenShareState>("idle");

  const isScreenShareSupported =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function";

  const handleToggleScreenShare = useCallback(async () => {
    if (isSharing) {
      await stopScreenShare();
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
        // Button will be hidden — no toast needed
        return;
      }
      // "denied" covers both user cancellation and permission denial.
      // Show a dismissible toast so the user knows what happened.
      toast.error("Screen share was not started");
    }
  }, [isSharing, startScreenShare, stopScreenShare]);

  // Sync screenShareState with isSharing (auto-stop via track.ended)
  useEffect(() => {
    if (!isSharing && screenShareState === "sharing") {
      setScreenShareState("idle");
    }
  }, [isSharing, screenShareState]);

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 p-4">
        <VideoGrid ref={containerRef}>
          {dimensions.width > 0 && dimensions.height > 0 && (
            <>
              <RoomVideo
                userId={localUserId}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: layout.tileWidth,
                  height: layout.tileHeight,
                  transform: `translateX(${layout.tiles[0].x}px) translateY(${layout.tiles[0].y}px)`,
                }}
                stream={localVideoStream}
                username={currentUsername}
                isVideoEnabled={mediaControls.isVideoEnabled}
                isAudioEnabled={mediaControls.isAudioEnabled}
              />

              {remotePeers.length > 0 &&
                remotePeers.map((peer, index) => (
                  <RoomVideo
                    key={peer.userId}
                    userId={peer.userId}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: layout.tileWidth,
                      height: layout.tileHeight,
                      transform: `translateX(${layout.tiles[index + 1].x}px) translateY(${layout.tiles[index + 1].y}px)`,
                    }}
                    stream={peer.stream}
                    username={peer.username}
                    isVideoEnabled={peer.isVideoEnabled}
                    isAudioEnabled={peer.isAudioEnabled}
                  />
                ))}
            </>
          )}
        </VideoGrid>

        <RoomRemoteAudio />

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
          />
        </aside>
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
          screenShareState={screenShareState}
          onToggleScreenShare={handleToggleScreenShare}
        />

        <RoomRightControls
          isParticipantsVisible={isParticipantsVisible}
          onToggleParticipants={() => setIsParticipantsVisible((v) => !v)}
        />
      </div>
    </main>
  );
}
