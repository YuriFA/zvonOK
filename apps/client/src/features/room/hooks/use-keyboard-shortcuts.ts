import { useEffect } from "react";

export interface UseKeyboardShortcutsOptions {
  onToggleAudio: () => void | Promise<void>;
  onToggleVideo: () => void | Promise<void>;
  onToggleScreenShare: () => void | Promise<void>;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  enabled = true,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "m") {
        void onToggleAudio();
      } else if (key === "v") {
        void onToggleVideo();
      } else if (key === "s") {
        void onToggleScreenShare();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onToggleAudio, onToggleVideo, onToggleScreenShare]);
}
