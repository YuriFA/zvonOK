import { apiClient } from "@/lib/api/api-client";

import type { Room, CreateRoomInput, UpdateRoomInput } from "../types/room.types";

export interface GuestRequestResponse {
  requestId: string;
}

export interface GuestStatusResponse {
  status: "pending" | "approved" | "denied";
  token?: string;
}

export interface GuestApproveResponse {
  token: string;
}

class RoomApi {
  private readonly client = apiClient;

  async createRoom(input: CreateRoomInput): Promise<Room> {
    return this.client.post<Room>("/rooms", input);
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

  async guestRequest(slug: string, displayName: string): Promise<GuestRequestResponse> {
    return this.client.post<GuestRequestResponse>(`/rooms/${slug}/guest-request`, {
      displayName,
    });
  }

  async guestApprove(slug: string, requestId: string): Promise<GuestApproveResponse> {
    return this.client.post<GuestApproveResponse>(`/rooms/${slug}/guest-approve`, {
      requestId,
    });
  }

  async guestDeny(slug: string, requestId: string): Promise<void> {
    return this.client.post<void>(`/rooms/${slug}/guest-deny`, { requestId });
  }

  async guestStatus(slug: string, requestId: string): Promise<GuestStatusResponse> {
    return this.client.get<GuestStatusResponse>(`/rooms/${slug}/guest-status/${requestId}`);
  }
}

export const roomApi = new RoomApi();
