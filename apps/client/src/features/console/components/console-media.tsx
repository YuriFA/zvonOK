import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useProjectRecordings, useProjectRooms } from "../hooks/use-console";
import { formatBytes } from "../lib/format";
import { devApi } from "../services/dev-api";
import type { DevRecordingView } from "../types/console.types";

export function ConsoleRooms({ projectId }: { projectId: string }) {
  const rooms = useProjectRooms(projectId);

  if (rooms.isPending) {
    return <p className="text-sm text-muted-foreground">Loading rooms...</p>;
  }
  if (rooms.isError) {
    return <p className="text-sm text-destructive">Failed to load rooms</p>;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Rooms</h2>
      {rooms.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No rooms yet. Rooms created through the platform API with this project's keys appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {rooms.data.map((room) => (
            <li
              key={room.id}
              className="flex items-center justify-between rounded-lg border bg-card p-3"
              data-testid={`room-${room.id}`}
            >
              <div>
                <p className="text-sm font-medium">{room.name ?? room.slug}</p>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(room.createdAt).toLocaleString()}
                  {room.endedAt ? ` - ended ${new Date(room.endedAt).toLocaleString()}` : ""}
                </p>
              </div>
              <Badge variant={room.status === "active" ? "default" : "outline"}>
                {room.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecordingRow({
  projectId,
  recording,
}: {
  projectId: string;
  recording: DevRecordingView;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const play = async () => {
    if (objectUrl) return;
    setLoading(true);
    try {
      const blob = await devApi.fetchRecordingFile(projectId, recording.id);
      setObjectUrl(URL.createObjectURL(blob));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load recording");
    } finally {
      setLoading(false);
    }
  };

  return (
    <li
      className="space-y-2 rounded-lg border bg-card p-3"
      data-testid={`recording-${recording.id}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Recording {recording.id.slice(0, 8)}...</p>
          <p className="text-xs text-muted-foreground">
            {new Date(recording.startedAt).toLocaleString()}
            {recording.recordingSizeBytes !== null
              ? ` - ${formatBytes(recording.recordingSizeBytes)}`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {!objectUrl && (
            <Button size="sm" onClick={() => void play()} disabled={loading}>
              {loading ? "Loading..." : "Play"}
            </Button>
          )}
          {objectUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const anchor = document.createElement("a");
                anchor.href = objectUrl;
                anchor.download = `${recording.id}.mp4`;
                anchor.click();
              }}
            >
              Download
            </Button>
          )}
        </div>
      </div>
      {objectUrl && (
        <video
          src={objectUrl}
          controls
          className="w-full rounded-md"
          data-testid="recording-player"
        />
      )}
    </li>
  );
}

export function ConsoleRecordings({ projectId }: { projectId: string }) {
  const recordings = useProjectRecordings(projectId);

  if (recordings.isPending) {
    return <p className="text-sm text-muted-foreground">Loading recordings...</p>;
  }
  if (recordings.isError) {
    return <p className="text-sm text-destructive">Failed to load recordings</p>;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Recordings</h2>
      {recordings.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recordings yet. Start egress recording for a project room through the platform API.
        </p>
      ) : (
        <ul className="space-y-2">
          {recordings.data.map((recording) => (
            <RecordingRow key={recording.id} projectId={projectId} recording={recording} />
          ))}
        </ul>
      )}
    </div>
  );
}
