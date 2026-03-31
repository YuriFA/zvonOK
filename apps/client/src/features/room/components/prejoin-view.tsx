import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeviceSelector } from "@/features/media/components/device-selector";

import { PrejoinRoomHeader } from "./prejoin-room-header";

interface PrejoinViewProps {
  roomUrl: string;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onJoin: () => void;
}

export function PrejoinView({
  roomUrl,
  displayName,
  onDisplayNameChange,
  onJoin,
}: PrejoinViewProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <PrejoinRoomHeader roomUrl={roomUrl} />

      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="mx-auto w-full max-w-xl space-y-4">
          <DeviceSelector username={displayName} />

          <div className="flex items-center justify-center gap-3">
            <Input
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="Your name"
              className="max-w-[200px]"
            />

            <Button size="lg" onClick={onJoin}>
              Join Room
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
