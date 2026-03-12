import { useState } from 'react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ParticipantItem } from './ParticipantItem';

export interface Participant {
  id: string;
  userId?: string;
  username: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isConnected: boolean;
  isSpeaking?: boolean;
}

export interface ParticipantsListProps {
  participants: Participant[];
  currentUserId?: string;
  roomOwnerId?: string;
  onKickParticipant?: (participantId: string) => void;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function ParticipantsList({
  participants,
  currentUserId,
  roomOwnerId,
  onKickParticipant,
  className,
  collapsible = true,
  defaultExpanded = true,
}: ParticipantsListProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const participantCount = participants.length;
  const isOwner = currentUserId === roomOwnerId;

  const sortedParticipants = [...participants].sort((a, b) => {
    // Local user first
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    // Then connected users
    if (a.isConnected !== b.isConnected) {
      return a.isConnected ? -1 : 1;
    }
    // Then alphabetically
    return a.username.localeCompare(b.username);
  });

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <button
        type="button"
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center justify-between px-4 py-3',
          collapsible && 'cursor-pointer hover:bg-muted/50'
        )}
        aria-expanded={isExpanded}
        aria-controls="participants-list-content"
      >
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <span className="font-medium">Participants</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {participantCount}
          </span>
        </div>
        {collapsible && (
          <span className="text-muted-foreground" aria-hidden="true">
            {isExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </span>
        )}
      </button>

      {isExpanded && (
        <div
          id="participants-list-content"
          className="border-t px-2 py-2"
        >
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
      )}
    </div>
  );
}
