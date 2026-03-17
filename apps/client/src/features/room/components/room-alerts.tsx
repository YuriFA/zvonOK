interface RoomAlertsProps {
  endRoomError?: boolean;
  wasKicked?: boolean;
}

export function RoomAlerts({ endRoomError, wasKicked }: RoomAlertsProps) {
  if (!endRoomError && !wasKicked) return null;

  return (
    <>
      {endRoomError && (
        <div className="container mx-auto px-4 py-4">
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            Failed to end room
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
