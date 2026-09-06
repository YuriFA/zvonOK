import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type LocalRecorderState = "idle" | "recording" | "saving";

export interface UseLocalRecorderOptions {
  videoStream: MediaStream | null;
  audioStream: MediaStream | null;
  roomSlug: string;
}

export interface UseLocalRecorderResult {
  state: LocalRecorderState;
  elapsedSeconds: number;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
}

const PREFERRED_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
] as const;

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }
  for (const mimeType of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return null;
}

function sanitizeRoomSlug(slug: string): string {
  const sanitized = slug.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized : "room";
}

function formatFileTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function useLocalRecorder({
  videoStream,
  audioStream,
  roomSlug,
}: UseLocalRecorderOptions): UseLocalRecorderResult {
  const [state, setState] = useState<LocalRecorderState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tracksRef = useRef<MediaStreamTrack[]>([]);
  const filenameRef = useRef<string>("");
  const startedAtRef = useRef<number>(0);
  const isSupported = useMemo(() => pickMimeType() !== null, []);
  const stopAndSave = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }
    setState("saving");
    recorder.stop();
  }, []);

  const start = useCallback(() => {
    if (recorderRef.current) {
      return;
    }
    const mimeType = pickMimeType();
    if (!mimeType) {
      return;
    }
    const videoTracks = (videoStream?.getTracks() ?? []).filter(
      (track) => track.readyState === "live",
    );
    const audioTracks = (audioStream?.getTracks() ?? []).filter(
      (track) => track.readyState === "live",
    );
    const tracks = [...videoTracks, ...audioTracks];
    if (tracks.length === 0) {
      return;
    }

    const combined = new MediaStream(tracks);
    const recorder = new MediaRecorder(combined, { mimeType });
    chunksRef.current = [];
    tracksRef.current = tracks;
    recorderRef.current = recorder;
    filenameRef.current = `zvonok-${sanitizeRoomSlug(roomSlug)}-${formatFileTimestamp(new Date())}.webm`;
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const chunks = chunksRef.current;
      chunksRef.current = [];
      for (const track of tracksRef.current) {
        track.onended = null;
      }
      tracksRef.current = [];
      recorderRef.current = null;
      if (chunks.length > 0) {
        saveBlob(new Blob(chunks, { type: mimeType }), filenameRef.current);
      }
      setState("idle");
    };

    for (const track of tracks) {
      track.onended = () => stopAndSave();
    }

    recorder.start(1000);
    setElapsedSeconds(0);
    setState("recording");
  }, [videoStream, audioStream, roomSlug, stopAndSave]);

  // Elapsed time derives from the start timestamp so it never drifts.
  useEffect(() => {
    if (state !== "recording") {
      return;
    }
    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(interval);
      setElapsedSeconds(0);
    };
  }, [state]);

  // Leaving the room mid-recording still saves what was captured.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    };
  }, []);

  return {
    state,
    elapsedSeconds,
    isSupported,
    start,
    stop: stopAndSave,
  };
}
