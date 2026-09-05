import { createMediaManager } from "@zvonok/client/media/manager-factory";
import { sfuManager } from "@zvonok/client/sfu/manager";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router";

import { LinkButton } from "@/components/ui/link-button";
import { useAuth } from "@/features/auth/contexts/auth.context";
import { MediaManagerProvider } from "@/features/media/contexts/media-manager.context";
import { MediaStreamProvider } from "@/features/media/contexts/media-stream.context";
import { CallEndedView } from "@/features/room/components/call-ended-view";
import { GuestApprovalDialog } from "@/features/room/components/guest-approval-dialog";
import { PrejoinView } from "@/features/room/components/prejoin-view";
import { RoomView } from "@/features/room/components/room-view";
import { GuestRequestsProvider } from "@/features/room/contexts/guest-requests.context";
import { useGuestJoinRoom } from "@/features/room/hooks/use-guest-join-room";
import { useRoom } from "@/features/room/hooks/use-room";
import { roomApi } from "@/features/room/services/room-api";
import { SfuManagerProvider } from "@/features/sfu/contexts/sfu-manager.context";
import { loadGuestDisplayName, saveGuestDisplayName } from "@/lib/utils/display-name";

type RoomViewState = "prejoin" | "active" | "ended";

export const RoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [viewState, setViewState] = useState<RoomViewState>("prejoin");
  const { user, isLoading: authLoading } = useAuth();

  const { data: room, isLoading, error } = useRoom(slug || "");

  const [displayName, setDisplayName] = useState(() => user?.username ?? loadGuestDisplayName());
  const [guestPreApproved, setGuestPreApproved] = useState(false);

  const mediaManager = useMemo(() => createMediaManager(), []);

  const [guestUserId, setGuestUserId] = useState<string | undefined>(undefined);

  const currentUserId = user?.id ?? guestUserId;

  const handleJoined = useCallback(() => {
    setViewState("active");
  }, []);
  const {
    join,
    retry,
    guestState,
    error: joinError,
  } = useGuestJoinRoom({ onJoinApproved: handleJoined });

  // On mount: if guest, check for a valid HTTP-only cookie
  useEffect(() => {
    if (user || !slug) return;
    roomApi
      .guestCheck(slug)
      .then((result) => {
        if (result.valid) {
          setGuestPreApproved(true);
          if (result.displayName) {
            setDisplayName(result.displayName);
          }
        }
      })
      .catch(() => {
        // silent fail — treat as no pre-approval
      });
  }, [user, slug]);

  // Resolve guest identity from the server once the guest enters the room
  useEffect(() => {
    if (user || !slug || viewState !== "active") return;
    roomApi
      .getRoomMe(slug)
      .then((result) => setGuestUserId(result.userId))
      .catch(() => {
        // silent fail — identity will be undefined
      });
  }, [user, slug, viewState]);

  useEffect(() => {
    if (room?.status === "ended") {
      setViewState("ended");
    }
  }, [room?.status]);

  const handleRoomEnded = useCallback(() => {
    setViewState("ended");
  }, []);

  useEffect(() => {
    if (viewState !== "active") return;
    const unsubscribe = sfuManager.onRoomEnded(handleRoomEnded);
    return unsubscribe;
  }, [viewState, handleRoomEnded]);

  const handleJoin = useCallback(async () => {
    if (!slug) return;

    if (user || guestPreApproved) {
      setViewState("active");
      return;
    }

    saveGuestDisplayName(displayName);

    await join({ slug, displayName });
  }, [user, guestPreApproved, slug, displayName, join]);

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-dscreen items-center justify-center">
        <p className="text-muted-foreground">Loading room...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex min-h-dscreen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error?.message || "Room not found"}</p>
        <LinkButton to="/">Back to Home</LinkButton>
      </div>
    );
  }

  if (viewState === "ended") {
    return <CallEndedView room={room} />;
  }

  const roomUrl = `${window.location.origin}/room/${room.slug}`;
  const isOwner = user?.id === room.ownerId;

  return (
    <MediaManagerProvider manager={mediaManager}>
      <SfuManagerProvider manager={sfuManager}>
        <MediaStreamProvider>
          {viewState === "prejoin" ? (
            <PrejoinView
              roomUrl={roomUrl}
              displayName={displayName}
              onDisplayNameChange={setDisplayName}
              onJoin={handleJoin}
              guestState={user ? undefined : guestState}
              errorMessage={joinError}
              onRetry={retry}
            />
          ) : (
            <>
              {isOwner ? (
                <GuestRequestsProvider roomSlug={room.slug}>
                  <GuestApprovalDialog />
                  <RoomView room={room} displayName={displayName} currentUserId={currentUserId} />
                </GuestRequestsProvider>
              ) : (
                <RoomView room={room} displayName={displayName} currentUserId={currentUserId} />
              )}
            </>
          )}
        </MediaStreamProvider>
      </SfuManagerProvider>
    </MediaManagerProvider>
  );
};
