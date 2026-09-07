import { useState } from "react";
import { Navigate } from "react-router";
import { toast } from "sonner";

import { MainHeader } from "@/components/main-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/contexts/auth.context";
import { useCallHistory } from "@/features/history/hooks/use-call-history";
import { useCallRecord, useDeleteCallRecord } from "@/features/history/hooks/use-call-record";
import type { CallRecordSummary } from "@/features/history/types/history.types";
import { ROUTES } from "@/lib/config/routes";

function formatDuration(startedAt: string, endedAt: string): string {
  const seconds = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000),
  );
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest}s`;
  return `${minutes}m ${rest}s`;
}

function CallRecordRow({ record }: { record: CallRecordSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const transcript = useCallRecord(expanded ? record.id : "");
  const deleteRecord = useDeleteCallRecord({
    onSuccess: () => toast.success("Call record deleted"),
    onError: (error) => toast.error(error.message || "Failed to delete record"),
  });

  const messages = transcript.data?.messages ?? [];

  return (
    <li className="rounded-lg border bg-card p-4" data-testid={`record-${record.id}`}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex-1 text-left"
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="block font-medium">{record.roomName}</span>
          <span className="block text-sm text-muted-foreground">
            {new Date(record.endedAt).toLocaleString()} ·{" "}
            {formatDuration(record.startedAt, record.endedAt)} · {record.messageCount} messages
          </span>
        </button>
        {confirming ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteRecord.isPending}
              onClick={() => deleteRecord.mutate(record.id)}
            >
              Confirm
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Delete
          </Button>
        )}
      </div>

      {expanded ? (
        transcript.isPending ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading chat…</p>
        ) : transcript.isError ? (
          <p className="mt-3 text-sm text-destructive">Failed to load the transcript</p>
        ) : messages.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No chat messages</p>
        ) : (
          <ul className="mt-3 space-y-2" data-testid="transcript">
            {messages.map((message, index) => (
              <li key={index} className="text-sm">
                <span className="font-medium">{message.author}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </span>
                <p>{message.content}</p>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </li>
  );
}

export const HistoryPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const history = useCallHistory();

  if (isLoading) {
    return (
      <div className="flex min-h-dscreen flex-col bg-background">
        <MainHeader />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return (
    <div className="flex min-h-dscreen flex-col bg-background">
      <MainHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Call history</h1>

        {history.isPending ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : history.isError ? (
          <p className="text-destructive">
            {history.error.message || "Failed to load call history"}
          </p>
        ) : history.data.length === 0 ? (
          <p className="text-muted-foreground">No calls yet. Calls you end will appear here.</p>
        ) : (
          <ul className="space-y-3" data-testid="history-list">
            {history.data.map((record) => (
              <CallRecordRow key={record.id} record={record} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};
