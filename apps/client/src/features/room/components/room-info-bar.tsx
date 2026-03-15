import { Users, Calendar } from 'lucide-react';
import type { Room } from '@/features/room/types/room.types';

interface RoomInfoBarProps {
  room: Room;
  className?: string;
}

export function RoomInfoBar({ room, className }: RoomInfoBarProps) {
  return (
    <div className={`flex gap-4 text-sm text-muted-foreground${className ? ` ${className}` : ''}`}>
      <div className="flex items-center gap-1">
        <Users className="size-4" />
        <span>Up to {room.maxParticipants} participants</span>
      </div>
      <div className="flex items-center gap-1">
        <Calendar className="size-4" />
        <span>Created {new Date(room.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
