import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ParticipantItem } from './participant-item';
import type { QualityScore, QualityStats } from '@/lib/sfu/types';

export interface Participant {
  id: string;
  userId?: string;
  username: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isConnected: boolean;
  isSpeaking?: boolean;
  qualityScore?: QualityScore;
  qualityStats?: QualityStats;
}

export interface ParticipantsListProps {
  participants: Participant[];
  currentUserId?: string;
  roomOwnerId?: string;
  onKickParticipant?: (participantId: string) => void;
  className?: string;
}

export function ParticipantsList({
  participants,
  currentUserId,
  roomOwnerId,
  onKickParticipant,
  className,
}: ParticipantsListProps) {
  const participantCount = participants.length;
  const isOwner = currentUserId === roomOwnerId;

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    if (a.isConnected !== b.isConnected) {
      return a.isConnected ? -1 : 1;
    }
    return a.username.localeCompare(b.username);
  });

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-2 px-4 py-3">
        <Users className="size-4 text-muted-foreground" />
        <span className="font-medium">Participants</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {participantCount}
        </span>
      </div>

      <div className="border-t px-2 py-2">
        {participants.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            No participants
          </p>
        ) : (
          <ul className="space-y-1" aria-label="Participants list">
            {sortedParticipants.map((participant) => (
              <ParticipantItem
                key={participant.id}
                {...participant}
                isLocalUser={participant.id === currentUserId}
                canKick={isOwner}
                onKick={onKickParticipant}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
