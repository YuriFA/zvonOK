import { lazy } from "react";

import type { RoomPanelProps } from "@/features/room/room-panels";
import { apiClient } from "@/lib/api/api-client";

// The Excalidraw engine bundle (1 MB+) loads only when the panel opens.
const WhiteboardPanel = lazy(() =>
  import("@zvonok/whiteboard-react/panel").then((mod) => ({
    default: mod.WhiteboardPanel,
  })),
);

export function WhiteboardPanelAdapter(props: RoomPanelProps) {
  return (
    <WhiteboardPanel
      {...props}
      socketUrl={import.meta.env.VITE_SOCKET_URL ?? ""}
      refreshSession={() => apiClient.refreshSession()}
    />
  );
}
