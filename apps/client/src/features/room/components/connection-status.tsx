import { Wifi, WifiOff } from 'lucide-react';
import type { SfuConnectionState } from '@/lib/sfu/types';

interface ConnectionStatusProps {
  connectionState: SfuConnectionState;
}

const LABELS: Record<SfuConnectionState, string> = {
  connecting: 'Connecting...',
  connected: 'Connected',
  failed: 'Connection failed',
  disconnected: 'Disconnected',
};

export function ConnectionStatus({ connectionState }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-1">
      {connectionState === 'connected' ? (
        <Wifi className="size-4 text-green-500" />
      ) : connectionState === 'connecting' ? (
        <Wifi className="size-4 animate-pulse text-yellow-500" />
      ) : (
        <WifiOff className="size-4 text-red-500" />
      )}
      <span className="capitalize">{LABELS[connectionState]}</span>
    </div>
  );
}
