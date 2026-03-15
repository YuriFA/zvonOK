interface RoomAlertsProps {
  endRoomError?: boolean;
  mediaError?: string | null;
  wasKicked?: boolean;
}

export function RoomAlerts({ endRoomError, mediaError, wasKicked }: RoomAlertsProps) {
  if (!endRoomError && !mediaError && !wasKicked) return null;

  return (
    <>
      {endRoomError && (
        <div className="container mx-auto px-4 py-4">
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            Failed to end room
          </div>
        </div>
      )}

      {mediaError && (
        <div className="container mx-auto px-4 py-4">
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            Camera/microphone unavailable: {mediaError}
          </div>
        </div>
      )}

      {wasKicked && (
        <div className="container mx-auto px-4 py-4">
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            You were removed from the room by the owner.
          </div>
        </div>
      )}
    </>
  );
}
