export interface Room {
  id: string;
  name: string | null;
  slug: string;
  ownerId: string;
  isPublic: boolean;
  maxParticipants: number;
  status: 'active' | 'ended';
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
  lastActivityAt: string | null;
}

export interface CreateRoomInput {
  name?: string;
  maxParticipants?: number;
}

export interface UpdateRoomInput {
  name?: string;
  status?: 'active' | 'ended';
  maxParticipants?: number;
}
