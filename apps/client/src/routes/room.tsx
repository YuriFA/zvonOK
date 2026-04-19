import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "react-router";

import { LinkButton } from "@/components/ui/link-button";
import { useAuth } from "@/features/auth/contexts/auth.context";
import { MediaManagerProvider } from "@/features/media/contexts/media-manager.context";
import { MediaStreamProvider } from "@/features/media/contexts/media-stream.context";
import { CallEndedView } from "@/features/room/components/call-ended-view";
import { GuestApprovalDialog } from "@/features/room/components/guest-approval-dialog";
import { GuestJoinForm } from "@/features/room/components/guest-join-form";
import { PrejoinView } from "@/features/room/components/prejoin-view";
import { RoomView } from "@/features/room/components/room-view";
import { useRoom } from "@/features/room/hooks/use-room";
import { SfuManagerProvider } from "@/features/sfu/contexts/sfu-manager.context";
import { createMediaManager } from "@/lib/media/manager-factory";
import { sfuManager } from "@/lib/sfu/manager";
import { loadGuestDisplayName, saveGuestDisplayName } from "@/lib/utils/display-name";

type RoomViewState = "prejoin" | "active" | "ended";

export const RoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [viewState, setViewState] = useState<RoomViewState>("prejoin");
  const { user, isLoading: authLoading } = useAuth();

  const { data: room, isLoading, error } = useRoom(slug || "");

  const [displayName, setDisplayName] = useState(() => user?.username ?? loadGuestDisplayName());
  const guestTokenRef = useRef<string | null>(null);

  const mediaManager = useMemo(() => createMediaManager(), []);

  useEffect(() => {
    if (!user) {
      setDisplayName(loadGuestDisplayName());
    }
  }, [user]);

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

  const handleJoin = () => {
    if (!user) {
      saveGuestDisplayName(displayName);
    }

    setViewState("active");
  };

  const handleGuestApproved = useCallback((token: string) => {
    guestTokenRef.current = token;
    setViewState("active");
  }, []);

  const handleGuestDenied = useCallback(() => {
    // stay on form, GuestJoinForm handles its own "denied" state
  }, []);

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
            user ? (
              <PrejoinView
                roomUrl={roomUrl}
                displayName={displayName}
                onDisplayNameChange={setDisplayName}
                onJoin={handleJoin}
              />
            ) : (
              <GuestJoinForm
                roomUrl={roomUrl}
                slug={room.slug}
                displayName={displayName}
                onDisplayNameChange={setDisplayName}
                onApproved={handleGuestApproved}
                onDenied={handleGuestDenied}
              />
            )
          ) : (
            <>
              {isOwner && (
                <GuestApprovalDialog roomSlug={room.slug} />
              )}
              <RoomView room={room} displayName={displayName} />
            </>
          )}
        </MediaStreamProvider>
      </SfuManagerProvider>
    </MediaManagerProvider>
  );
};
