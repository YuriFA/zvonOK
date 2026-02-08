import { apiClient } from '@/lib/api/api-client';
import type { Room, CreateRoomInput, UpdateRoomInput } from '../types/room.types';

export class RoomApi {
  private readonly client = apiClient;

  async createRoom(input: CreateRoomInput): Promise<Room> {
    return this.client.post<Room>('/rooms', input);
  }


  async getRoomBySlug(slug: string): Promise<Room> {
    return this.client.get<Room>(`/rooms/${slug}`);
  }

  async updateRoom(id: string, input: UpdateRoomInput): Promise<Room> {
    return this.client.patch<Room>(`/rooms/${id}`, input);
  }

  async endRoom(id: string): Promise<void> {
    return this.client.delete<void>(`/rooms/${id}`);
  }
}

export const roomApi = new RoomApi();
