import type { ComponentType } from "react";

import { whiteboardRoomPanel } from "@/features/whiteboard/room-panel";

/** Context the host injects into every registered room panel. */
export interface RoomPanelProps {
  roomSlug: string;
  isOwner: boolean;
  onClose(): void;
}

/**
 * A pluggable overlay panel for the room view. Panels register here and own
 * everything below this contract; the room view stays panel-agnostic.
 */
export interface RoomPanelDescriptor {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType<RoomPanelProps>;
}

/** The registration point: adding a panel means adding its descriptor here. */
export const roomPanels: RoomPanelDescriptor[] = [whiteboardRoomPanel];
