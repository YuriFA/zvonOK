import { apiClient } from "@/lib/api/api-client";

import type { ChatHistoryResponse } from "../types/chat.types";

class ChatApi {
  private readonly client = apiClient;

  async getMessages(roomId: string, page = 1, limit = 50): Promise<ChatHistoryResponse> {
    return this.client.get<ChatHistoryResponse>(`/messages/${roomId}?page=${page}&limit=${limit}`);
  }
}

export const chatApi = new ChatApi();
