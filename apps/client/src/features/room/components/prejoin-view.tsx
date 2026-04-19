import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeviceSelector } from "@/features/media/components/device-selector";

import { PrejoinRoomHeader } from "./prejoin-room-header";

export type GuestState = "idle" | "waiting" | "denied" | "error";

interface PrejoinViewProps {
  roomUrl: string;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onJoin: () => void;
  guestState?: GuestState;
  errorMessage?: string;
  onRetry?: () => void;
}

export function PrejoinView({
  roomUrl,
  displayName,
  onDisplayNameChange,
  onJoin,
  guestState = "idle",
  errorMessage,
  onRetry,
}: PrejoinViewProps) {
  const isIdle = guestState === "idle";

  return (
    <div className="flex min-h-dscreen flex-col">
      <PrejoinRoomHeader roomUrl={roomUrl} />

      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="mx-auto w-full max-w-xl space-y-4">
          <DeviceSelector username={displayName} />

          {guestState === "waiting" && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4 text-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Waiting for room owner to approve...
              </p>
            </div>
          )}

          {guestState === "denied" && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive bg-card p-4 text-center">
              <p className="text-sm text-destructive">
                Your request to join was denied.
              </p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try Again
              </Button>
            </div>
          )}

          {guestState === "error" && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive bg-card p-4 text-center">
              <p className="text-sm text-destructive">
                {errorMessage ?? "Something went wrong. Please try again."}
              </p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try Again
              </Button>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <Input
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="Your name"
              className="max-w-[200px]"
              readOnly={!isIdle}
            />

            {isIdle && (
              <Button size="lg" onClick={onJoin}>
                Join Room
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
