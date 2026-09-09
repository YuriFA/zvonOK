import { Presentation } from "lucide-react";

import type { RoomPanelDescriptor } from "@/features/room/room-panels";

import { WhiteboardPanelAdapter } from "./whiteboard-panel-adapter";

export const whiteboardRoomPanel: RoomPanelDescriptor = {
  id: "board",
  title: "Whiteboard",
  icon: Presentation,
  component: WhiteboardPanelAdapter,
};
