import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SfuGuestJoinRequestPayload } from "@/lib/sfu/types";
import type { QualityScore, QualityStats } from "@/lib/sfu/types";
import { cn } from "@/lib/utils";

import { ParticipantItem } from "./participant-item";

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
  pendingRequests?: SfuGuestJoinRequestPayload[];
  onApproveRequest?: (requestId: string) => Promise<void>;
  onDenyRequest?: (requestId: string) => Promise<void>;
  className?: string;
}

export function ParticipantsList({
  participants,
  currentUserId,
  roomOwnerId,
  onKickParticipant,
  pendingRequests,
  onApproveRequest,
  onDenyRequest,
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

  const hasPendingRequests = isOwner && pendingRequests && pendingRequests.length > 0;

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="flex items-center gap-2 px-4 py-3">
        <Users className="size-4 text-muted-foreground" />
        <span className="font-medium">Participants</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {participantCount}
        </span>
      </div>

      <div className="border-t px-2 py-2">
        {participants.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">No participants</p>
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

      {hasPendingRequests && (
        <div className="border-t">
          <div className="px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pending Requests
            </span>
          </div>
          <ul className="space-y-1 px-2 pb-2" aria-label="Pending join requests">
            {pendingRequests.map((req) => (
              <li
                key={req.requestId}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
              >
                <span className="truncate text-sm">{req.displayName}</span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => onApproveRequest?.(req.requestId)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => onDenyRequest?.(req.requestId)}
                  >
                    Deny
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
