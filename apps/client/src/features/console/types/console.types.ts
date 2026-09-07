export interface DevProject {
  id: string;
  name: string;
  webhookUrl: string | null;
  createdAt: string;
  roomCount: number;
}

export interface DevApiKeyView {
  id: string;
  prefix: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface DevApiKeyCreated {
  id: string;
  key: string;
  prefix: string;
  createdAt: string;
}

export interface DevProjectRoom {
  id: string;
  name: string | null;
  slug: string;
  status: "active" | "ended";
  createdAt: string;
  endedAt: string | null;
}

export interface DevRecordingView {
  id: string;
  roomId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  endedReason: string | null;
  recordingUrl: string;
  recordingSizeBytes: number | null;
  recordingFinalizedAt: string | null;
}

export interface DevWebhookConfigured {
  url: string;
  secret: string;
}
