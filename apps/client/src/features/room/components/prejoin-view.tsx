import { useCallback, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyLink } from '@/components/ui/copy-link';
import { DeviceSelector } from '@/features/media/components/device-selector';
import { useDeviceValidation } from '@/features/media/hooks/use-device-validation';
import type { Room } from '@/features/room/types/room.types';
import { RoomHeader } from './room-header';

interface PrejoinViewProps {
  room: Room;
  roomUrl: string;
  onJoin: () => void;
}

export function PrejoinView({ room, roomUrl, onJoin }: PrejoinViewProps) {
  const { errors: deviceErrors, validate, dismissError, dismissAll } = useDeviceValidation();
  const [isValidating, setIsValidating] = useState(false);

  const handleJoin = useCallback(async () => {
    setIsValidating(true);
    try {
      const isValid = await validate();
      if (isValid) {
        dismissAll();
        onJoin();
      }
    } finally {
      setIsValidating(false);
    }
  }, [validate, dismissAll, onJoin]);

  const handleJoinAnyway = useCallback(() => {
    dismissAll();
    onJoin();
  }, [dismissAll, onJoin]);

  return (
    <div className="min-h-screen flex flex-col">
      <RoomHeader variant="prejoin" room={room} />

      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="mx-auto w-full max-w-xl space-y-4">
          <DeviceSelector />

          {deviceErrors.length > 0 && (
            <div className="space-y-2">
              {deviceErrors.map((err) => (
                <div
                  key={err.kind}
                  className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <p className="flex-1 text-sm text-destructive">{err.message}</p>
                  <button
                    type="button"
                    className="shrink-0 text-destructive/70 hover:text-destructive"
                    onClick={() => dismissError(err.kind)}
                    aria-label={`Dismiss ${err.kind} error`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleJoinAnyway}
              >
                Join with available devices
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <CopyLink url={roomUrl} variant="compact" />

            <Button size="lg" onClick={handleJoin} disabled={isValidating}>
              {isValidating ? 'Checking...' : 'Join Room'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
