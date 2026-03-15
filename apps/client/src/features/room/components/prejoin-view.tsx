import { Button } from '@/components/ui/button';
import { CopyLink } from '@/components/ui/copy-link';
import { DeviceSelector } from '@/features/media/components/device-selector';
import type { Room } from '@/features/room/types/room.types';
import { RoomHeader } from './room-header';
import { RoomInfoBar } from './room-info-bar';

interface PrejoinViewProps {
  room: Room;
  roomUrl: string;
  onJoin: () => void;
}

export function PrejoinView({ room, roomUrl, onJoin }: PrejoinViewProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <RoomHeader variant="prejoin" room={room} />

      <main className="flex flex-1 flex-col p-4">
        <RoomInfoBar room={room} className="mb-6" />

        <div className="mx-auto grid w-full max-w-2xl gap-6">
          <div>
            <h2 className="mb-4 text-xl font-semibold">Setup Your Devices</h2>
            <DeviceSelector />
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold">Share Room Link</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Copy this link and share it with others to invite them to the room.
            </p>
            <CopyLink url={roomUrl} />
          </div>

          <div className="flex justify-end">
            <Button size="lg" onClick={onJoin}>
              Join Room
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
