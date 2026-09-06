import { Loader2, Lock, LockOpen, X } from "lucide-react";
import { lazy, Suspense } from "react";
import type { Editor } from "tldraw";

import { Button } from "@/components/ui/button";

import type { WhiteboardDrawMode, WhiteboardStatus } from "../hooks/use-whiteboard";

import "tldraw/tldraw.css";

// The tldraw bundle is 1 MB+; load it only when a board actually opens.
const Tldraw = lazy(() => import("tldraw").then((mod) => ({ default: mod.Tldraw })));

interface Props {
  mode: WhiteboardDrawMode;
  status: WhiteboardStatus;
  isOwner: boolean;
  onEditorMount: (editor: Editor) => void;
  onToggleMode: (next: WhiteboardDrawMode) => void;
  onClose: () => void;
}

export function WhiteboardPanel({
  mode,
  status,
  isOwner,
  onEditorMount,
  onToggleMode,
  onClose,
}: Props) {
  const canDraw = mode === "open" || isOwner;

  return (
    <div className="absolute inset-2 z-10 flex flex-col overflow-hidden rounded-lg bg-card ring-1 ring-border md:inset-0 md:rounded-none md:ring-0">
      <div className="flex items-center gap-2 border-b bg-card px-3 py-2">
        <span className="text-sm font-medium">Whiteboard</span>
        <span
          className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          role="status"
          aria-label={mode === "open" ? "Drawing open to all" : "Drawing locked to host"}
        >
          {mode === "open" ? (
            <>
              <LockOpen className="size-3" /> Drawing open
            </>
          ) : (
            <>
              <Lock className="size-3" /> Host-only drawing
            </>
          )}
        </span>
        {isOwner && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            onClick={() => onToggleMode(mode === "open" ? "owner" : "open")}
          >
            {mode === "open" ? (
              <>
                <Lock className="size-3.5" /> Lock drawing
              </>
            ) : (
              <>
                <LockOpen className="size-3.5" /> Open drawing
              </>
            )}
          </Button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-sm p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close whiteboard"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {status === "connecting" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Connecting to board...</span>
          </div>
        )}
        {status === "error" ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            The board is unavailable in this room.
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <div className="size-full" data-readonly={!canDraw}>
              <Tldraw onMount={onEditorMount} />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  );
}
