import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Editor } from "tldraw";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "";

export type WhiteboardDrawMode = "owner" | "open";
export type WhiteboardStatus = "idle" | "connecting" | "open" | "error";

interface WhiteboardSnapshotEvent {
  snapshot: string;
  mode: WhiteboardDrawMode;
}

const PUBLISH_THROTTLE_MS = 400;
const EMPTY_SNAPSHOT = "{}";

/**
 * Applies a remote document snapshot onto the local editor: new and changed
 * records are merged by id (last write wins per record), and local shapes
 * that no longer exist remotely are removed so erasures propagate.
 */
function applyRemoteSnapshot(editor: Editor, raw: string): void {
  let parsed: { store?: Record<string, unknown> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  const remoteRecords = Object.values(parsed.store ?? {}).filter(
    (record): record is { id: string } =>
      typeof record === "object" &&
      record !== null &&
      typeof (record as { id?: unknown }).id === "string",
  );
  if (remoteRecords.length === 0 && raw === EMPTY_SNAPSHOT) {
    // Board was cleared server-side; drop all local document shapes.
    editor.store.mergeRemoteChanges(() => {
      editor.store.remove(
        editor.store
          .allRecords()
          .filter((r) => r.typeName === "shape")
          .map((r) => r.id),
      );
    });
    return;
  }

  const remoteIds = new Set(remoteRecords.map((r) => r.id));
  editor.store.mergeRemoteChanges(() => {
    if (remoteRecords.length > 0) {
      editor.store.put(remoteRecords as never);
    }
    editor.store.remove(
      editor.store
        .allRecords()
        .filter((r) => r.typeName === "shape" && !remoteIds.has(r.id))
        .map((r) => r.id),
    );
  });
}

interface UseWhiteboardOptions {
  roomSlug: string;
  enabled: boolean;
  onModeError?: (message: string) => void;
}

/**
 * Owns the `/whiteboard` socket connection for an open panel: joins the room
 * board, relays the local store to peers, applies peer snapshots, and tracks
 * the host draw-lock mode.
 */
export function useWhiteboard({ roomSlug, enabled, onModeError }: UseWhiteboardOptions) {
  const [status, setStatus] = useState<WhiteboardStatus>("idle");
  const [mode, setMode] = useState<WhiteboardDrawMode>("owner");
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const publishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Remote snapshots are applied with source 'remote', so the listener
  // (scoped to 'user') never re-publishes them.
  const pendingModeRef = useRef<WhiteboardDrawMode>("owner");

  useEffect(() => {
    if (!enabled || !roomSlug) {
      setStatus("idle");
      return;
    }

    const socket = io(`${SOCKET_URL}/whiteboard`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;
    setStatus("connecting");

    const join = () => {
      socket.emit("whiteboard:join", { roomSlug });
    };
    socket.on("connect", join);

    socket.on("whiteboard:snapshot", ({ snapshot, mode: boardMode }: WhiteboardSnapshotEvent) => {
      setMode(boardMode);
      pendingModeRef.current = boardMode;
      const editor = editorRef.current;
      if (editor && snapshot !== EMPTY_SNAPSHOT) {
        applyRemoteSnapshot(editor, snapshot);
      }
      editor?.updateInstanceState({ isReadonly: boardMode === "owner" });
      setStatus("open");
    });

    socket.on("whiteboard:op", ({ snapshot }: { snapshot: string }) => {
      const editor = editorRef.current;
      if (editor) applyRemoteSnapshot(editor, snapshot);
    });

    socket.on("whiteboard:mode", ({ mode: boardMode }: { mode: WhiteboardDrawMode }) => {
      setMode(boardMode);
      pendingModeRef.current = boardMode;
      editorRef.current?.updateInstanceState({
        isReadonly: boardMode === "owner",
      });
    });

    socket.on("whiteboard:error", ({ message }: { message: string }) => {
      setStatus("error");
      onModeError?.(message);
    });

    socket.on("disconnect", () => setStatus("connecting"));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (publishTimerRef.current) clearTimeout(publishTimerRef.current);
      publishTimerRef.current = null;
    };
  }, [enabled, roomSlug, onModeError]);

  /** Wire the tldraw editor once mounted: publish local edits, apply readonly. */
  const handleEditorMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      editor.updateInstanceState({ isReadonly: pendingModeRef.current === "owner" });

      editor.store.listen(
        () => {
          if (publishTimerRef.current) return;
          publishTimerRef.current = setTimeout(() => {
            publishTimerRef.current = null;
            const snapshot = editor.store.getStoreSnapshot("document");
            socketRef.current?.emit("whiteboard:op", {
              roomSlug,
              snapshot: JSON.stringify(snapshot),
            });
          }, PUBLISH_THROTTLE_MS);
        },
        { scope: "document", source: "user" },
      );

      // Re-join (re-open case): fetches a fresh snapshot on reconnect.
      if (socketRef.current?.connected) {
        socketRef.current.emit("whiteboard:join", { roomSlug });
      }
    },
    [roomSlug],
  );

  const setBoardMode = useCallback(
    (nextMode: WhiteboardDrawMode) => {
      const socket = socketRef.current;
      if (!socket?.connected) return;
      socket.emit("whiteboard:mode", { roomSlug, mode: nextMode });
    },
    [roomSlug],
  );

  return { status, mode, handleEditorMount, setBoardMode };
}
