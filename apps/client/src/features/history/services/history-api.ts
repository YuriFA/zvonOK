import { apiClient } from "@/lib/api/api-client";

import type { CallRecordDetail, CallRecordSummary } from "../types/history.types";

class HistoryApi {
  private readonly client = apiClient;

  async listCallHistory(): Promise<CallRecordSummary[]> {
    return this.client.get<CallRecordSummary[]>("/rooms/history");
  }

  async getCallRecord(id: string): Promise<CallRecordDetail> {
    return this.client.get<CallRecordDetail>(`/rooms/history/${id}`);
  }

  async deleteCallRecord(id: string): Promise<void> {
    return this.client.delete<void>(`/rooms/history/${id}`);
  }
}

export const historyApi = new HistoryApi();
