import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveGuestDisplayName } from "@/lib/utils/display-name";

import { roomApi } from "../services/room-api";
import { PrejoinRoomHeader } from "./prejoin-room-header";

interface GuestJoinFormProps {
  roomUrl: string;
  slug: string;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onApproved: (token: string) => void;
  onDenied: () => void;
}

type GuestState = "form" | "waiting" | "denied" | "error";

export function GuestJoinForm({
  roomUrl,
  slug,
  displayName,
  onDisplayNameChange,
  onApproved,
  onDenied,
}: GuestJoinFormProps) {
  const [state, setState] = useState<GuestState>("form");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!displayName.trim()) return;
    saveGuestDisplayName(displayName);

    try {
      const { requestId } = await roomApi.guestRequest(slug, displayName);
      if (!requestId) {
        setError("Room owner is not online. Please try again later.");
        setState("error");
        return;
      }
      setState("waiting");
      pollStatus(slug, requestId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send request");
      setState("error");
    }
  };

  const pollStatus = (roomSlug: string, requestId: string) => {
    const interval = setInterval(async () => {
      try {
        const result = await roomApi.guestStatus(roomSlug, requestId);
        if (result.status === "approved" && result.token) {
          clearInterval(interval);
          onApproved(result.token);
        } else if (result.status === "denied") {
          clearInterval(interval);
          setState("denied");
          onDenied();
        }
      } catch {
        clearInterval(interval);
        setError("Request expired or not found");
        setState("error");
      }
    }, 2000);
  };

  return (
    <div className="flex min-h-dscreen flex-col">
      <PrejoinRoomHeader roomUrl={roomUrl} />

      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="mx-auto w-full max-w-xl space-y-4 text-center">
          {state === "form" && (
            <>
              <h2 className="text-xl font-semibold">Join as Guest</h2>
              <p className="text-sm text-muted-foreground">
                Enter your name to request access to this room.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Input
                  value={displayName}
                  onChange={(e) => onDisplayNameChange(e.target.value)}
                  placeholder="Your name"
                  className="max-w-[200px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                />
                <Button size="lg" onClick={handleSubmit} disabled={!displayName.trim()}>
                  Request Access
                </Button>
              </div>
            </>
          )}

          {state === "waiting" && (
            <div className="space-y-3">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <p className="text-muted-foreground">Waiting for room owner to approve...</p>
            </div>
          )}

          {state === "denied" && (
            <div className="space-y-3">
              <p className="font-medium text-destructive">The room owner denied your request.</p>
              <Button variant="outline" onClick={() => setState("form")}>
                Try Again
              </Button>
            </div>
          )}

          {state === "error" && (
            <div className="space-y-3">
              <p className="font-medium text-destructive">{error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setState("form");
                  setError(null);
                }}
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
