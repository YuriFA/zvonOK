import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ParticipantsList } from '@/components/room/ParticipantsList';
import type { UseRoomSessionResult } from '@/features/room/hooks/use-room-session';
import type { Room } from '@/features/room/types/room.types';
import { MediaControls } from '@/features/media/components/media-controls';
import { cn } from '@/lib/utils';
import { computeLayout } from '@zvonok/video-layout';
import { VideoGrid } from '@/components/video-grid';
import { RoomVideo } from '@/features/room/components/room-video';
import { RoomRemoteAudio } from './room-remote-audio';

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
    () => computeLayout({
      containerWidth: dimensions.width,
      containerHeight: dimensions.height,
      participantCount: remotePeers.length + 1,
    }),
    [dimensions.width, dimensions.height, remotePeers.length],
  );

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { clientWidth: width, clientHeight: height } = entry.target
        setDimensions((prev) => {
          if (prev.width === width && prev.height === height) {
            return prev
          }
          return { width, height }
        })
      }
    })

    observer.observe(element)

    // Get initial dimensions
    setDimensions({
      width: element.clientWidth,
      height: element.clientHeight,
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  const handleToggleVideo = useCallback(async () => {
    await toggleVideo();
  }, [toggleVideo]);

  const handleToggleAudio = useCallback(async () => {
    await toggleAudio();
  }, [toggleAudio]);

  const [isParticipantsVisible, setIsParticipantsVisible] = useState(false);

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 p-4">
        <VideoGrid ref={containerRef}>
          {dimensions.width > 0 && dimensions.height > 0 && (
            <>
              <RoomVideo
                userId={localUserId}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: layout.tileWidth,
                  height: layout.tileHeight,
                  transform: `translateX(${layout.tiles[0].x}px) translateY(${layout.tiles[0].y}px)`
                }}
                stream={localVideoStream}
                username={currentUsername}
                isVideoEnabled={mediaControls.isVideoEnabled}
                isAudioEnabled={mediaControls.isAudioEnabled}
              />

              {remotePeers.length > 0 && remotePeers.map((peer, index) => (
                <RoomVideo
                  key={peer.userId}
                  userId={peer.userId}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: layout.tileWidth,
                    height: layout.tileHeight,
                    transform: `translateX(${layout.tiles[index + 1].x}px) translateY(${layout.tiles[index + 1].y}px)`
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
            'flex-1 transition-all duration-300 ease-in-out overflow-hidden',
            isParticipantsVisible ? 'max-w-80 ml-4' : 'max-w-0 ml-0',
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

      <div className="flex items-center justify-center border-t py-4">
        <MediaControls
          isVideoEnabled={mediaControls.isVideoEnabled}
          isAudioEnabled={mediaControls.isAudioEnabled}
          videoCaptureState={mediaControls.videoCaptureState}
          audioCaptureState={mediaControls.audioCaptureState}
          onToggleVideo={handleToggleVideo}
          onToggleAudio={handleToggleAudio}
          isParticipantsVisible={isParticipantsVisible}
          onToggleParticipants={() => setIsParticipantsVisible((v) => !v)}
        />
      </div>
    </main>
  );
}
