/** One past call as listed in the history page (no transcript payload). */
export interface CallRecordSummary {
  id: string;
  roomName: string;
  roomSlug: string;
  startedAt: string;
  endedAt: string;
  messageCount: number;
}

/** One chat message inside a call record's transcript snapshot. */
export interface CallRecordMessage {
  author: string;
  content: string;
  createdAt: string;
}

/** A call record with its full chat transcript. */
export interface CallRecordDetail extends CallRecordSummary {
  messages: CallRecordMessage[];
}
