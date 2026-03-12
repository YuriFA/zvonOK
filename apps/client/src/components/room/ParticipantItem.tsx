import { Mic, MicOff, Video, VideoOff, UserX, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { QualityIndicator } from './QualityIndicator';
import type { QualityScore, QualityStats } from '@/lib/sfu/types';

export interface ParticipantItemProps {
  id: string;
  username: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isConnected: boolean;
  isSpeaking?: boolean;
  isLocalUser?: boolean;
  canKick?: boolean;
  onKick?: (id: string) => void;
  qualityScore?: QualityScore;
  qualityStats?: QualityStats;
}

export function ParticipantItem({
  id,
  username,
  isMuted,
  isVideoOff,
  isConnected,
  isSpeaking,
  isLocalUser,
  canKick,
  onKick,
  qualityScore,
  qualityStats,
}: ParticipantItemProps) {
  const initial = username.charAt(0).toUpperCase() || '?';

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
        isSpeaking && 'bg-green-500/10',
        !isConnected && 'opacity-50'
      )}
      aria-label={`Participant ${username}${isLocalUser ? ' (you)' : ''}`}
    >
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            'flex size-9 items-center justify-center rounded-full text-sm font-medium',
            isLocalUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {initial}
        </div>
        {isSpeaking && (
          <Circle
            className="absolute -bottom-0.5 -right-0.5 size-3 fill-green-500 text-green-500"
            aria-label="Speaking"
          />
        )}
        {!isConnected && (
          <div
            className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-red-500"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{username}</span>
          {isLocalUser && (
            <span className="text-xs text-muted-foreground">(you)</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {!isConnected && (
            <span className="text-red-500">Disconnected</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isMuted ? (
          <MicOff className="size-4 text-red-500" aria-label="Muted" />
        ) : (
          <Mic className="size-4 text-green-500" aria-label="Microphone on" />
        )}
        {isVideoOff ? (
          <VideoOff className="size-4 text-red-500" aria-label="Camera off" />
        ) : (
          <Video className="size-4 text-green-500" aria-label="Camera on" />
        )}
      </div>

      {/* Quality indicator - only show for remote users with quality data */}
      {!isLocalUser && qualityScore && (
        <QualityIndicator
          score={qualityScore}
          stats={qualityStats}
          compact
        />
      )}

      {canKick && onKick && !isLocalUser && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={() => onKick(id)}
          aria-label={`Kick ${username}`}
        >
          <UserX className="size-4" />
        </Button>
      )}
    </li>
  );
}
