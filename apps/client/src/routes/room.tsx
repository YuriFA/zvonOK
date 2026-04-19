import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "react-router";

import { LinkButton } from "@/components/ui/link-button";
import { useAuth } from "@/features/auth/contexts/auth.context";
import { MediaManagerProvider } from "@/features/media/contexts/media-manager.context";
import { MediaStreamProvider } from "@/features/media/contexts/media-stream.context";
import { CallEndedView } from "@/features/room/components/call-ended-view";
import { GuestApprovalDialog } from "@/features/room/components/guest-approval-dialog";
import { GuestRequestsProvider } from "@/features/room/contexts/guest-requests.context";
import { PrejoinView } from "@/features/room/components/prejoin-view";
import type { GuestState } from "@/features/room/components/prejoin-view";
import { RoomView } from "@/features/room/components/room-view";
import { roomApi } from "@/features/room/services/room-api";
import { useRoom } from "@/features/room/hooks/use-room";
import { SfuManagerProvider } from "@/features/sfu/contexts/sfu-manager.context";
import { createMediaManager } from "@/lib/media/manager-factory";
import { sfuManager } from "@/lib/sfu/manager";
import { loadGuestDisplayName, saveGuestDisplayName } from "@/lib/utils/display-name";

type RoomViewState = "prejoin" | "active" | "ended";

const POLL_INTERVAL_MS = 2000;

export const RoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [viewState, setViewState] = useState<RoomViewState>("prejoin");
  const { user, isLoading: authLoading } = useAuth();

  const { data: room, isLoading, error } = useRoom(slug || "");

  const [displayName, setDisplayName] = useState(() => user?.username ?? loadGuestDisplayName());
  const [guestPreApproved, setGuestPreApproved] = useState(false);
  const [guestState, setGuestState] = useState<GuestState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const requestIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mediaManager = useMemo(() => createMediaManager(), []);

  // On mount: if guest, check for a valid HTTP-only cookie
  useEffect(() => {
    if (user || !slug) return;
    roomApi.guestCheck(slug).then((result) => {
      if (result.valid) {
        setGuestPreApproved(true);
        if (result.displayName) {
          setDisplayName(result.displayName);
        }
      }
    }).catch(() => {
      // silent fail — treat as no pre-approval
    });
  }, [user, slug]);

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

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback((currentSlug: string, requestId: string) => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const result = await roomApi.guestStatus(currentSlug, requestId);
        if (result.status === "approved") {
          stopPolling();
          setViewState("active");
        } else if (result.status === "denied") {
          stopPolling();
          setGuestState("denied");
        }
      } catch {
        stopPolling();
        setGuestState("error");
        setErrorMessage("Your request expired or something went wrong.");
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const handleRoomEnded = useCallback(() => {
    setViewState("ended");
  }, []);

  useEffect(() => {
    if (viewState !== "active") return;
    const unsubscribe = sfuManager.onRoomEnded(handleRoomEnded);
    return unsubscribe;
  }, [viewState, handleRoomEnded]);

  const handleJoin = useCallback(async () => {
    if (user || guestPreApproved) {
      if (!user) {
        saveGuestDisplayName(displayName);
      }
      setViewState("active");
      return;
    }

    if (!slug) return;

    saveGuestDisplayName(displayName);

    try {
      const { requestId } = await roomApi.guestRequest(slug, displayName);
      if (!requestId) {
        setGuestState("error");
        setErrorMessage("Room owner is not online. Please try again later.");
        return;
      }
      requestIdRef.current = requestId;
      setGuestState("waiting");
      startPolling(slug, requestId);
    } catch {
      setGuestState("error");
      setErrorMessage("Failed to send join request. Please try again.");
    }
  }, [user, guestPreApproved, slug, displayName, startPolling]);

  const handleRetry = useCallback(() => {
    stopPolling();
    requestIdRef.current = null;
    setGuestState("idle");
    setErrorMessage("");
  }, [stopPolling]);

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
              errorMessage={errorMessage}
              onRetry={handleRetry}
            />
          ) : (
            <>
              {isOwner ? (
                <GuestRequestsProvider roomSlug={room.slug}>
                  <GuestApprovalDialog />
                  <RoomView room={room} displayName={displayName} />
                </GuestRequestsProvider>
              ) : (
                <RoomView room={room} displayName={displayName} />
              )}
            </>
          )}
        </MediaStreamProvider>
      </SfuManagerProvider>
    </MediaManagerProvider>
  );
};
