import { LinkButton } from "@/components/ui/link-button";

import type { Room } from "../types/room.types";

interface CallEndedViewProps {
  room: Room;
}

export function CallEndedView({ room }: CallEndedViewProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Call Ended</h1>
        <p className="mt-2 text-muted-foreground">
          The call in <span className="font-medium">{room.name || "this room"}</span> has ended.
        </p>
      </div>

      <LinkButton to="/" size="lg">
        Back to Home
      </LinkButton>
    </div>
  );
}
