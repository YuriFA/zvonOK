import { MessageSquare, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RoomPanelDescriptor } from "@/features/room/room-panels";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  buttonVariant?: ButtonProps["variant"];
  buttonInactiveVariant?: ButtonProps["variant"];
  isParticipantsVisible: boolean;
  onToggleParticipants: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  /** Registered overlay panels, rendered as toggle buttons in order. */
  panels: RoomPanelDescriptor[];
  openPanelId: string | null;
  onTogglePanel: (id: string) => void;
  pendingRequestsCount?: number;
  unreadCount?: number;
}

export const RoomRightControls = ({
  className,
  buttonVariant = "outline",
  buttonInactiveVariant = "secondary",
  isParticipantsVisible,
  onToggleParticipants,
  isChatOpen,
  onToggleChat,
  panels,
  openPanelId,
  onTogglePanel,
  pendingRequestsCount = 0,
  unreadCount = 0,
}: Props) => {
  return (
    <div className={cn("flex gap-2", className)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant={isParticipantsVisible ? buttonInactiveVariant : buttonVariant}
              size="icon"
              onClick={onToggleParticipants}
              aria-label="Toggle participants"
            />
          }
        >
          <div className="relative">
            <Users className="size-4" />
            {pendingRequestsCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 flex size-4 items-center justify-center p-0 text-[10px]"
              >
                {pendingRequestsCount > 9 ? "9+" : pendingRequestsCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>Participants</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant={isChatOpen ? buttonInactiveVariant : buttonVariant}
              size="icon"
              onClick={onToggleChat}
              aria-label="Toggle chat"
            />
          }
        >
          <div className="relative">
            <MessageSquare className="size-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 flex size-4 items-center justify-center p-0 text-[10px]"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>Chat</TooltipContent>
      </Tooltip>

      {panels.map((panel) => {
        const PanelIcon = panel.icon;
        return (
          <Tooltip key={panel.id}>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={openPanelId === panel.id ? buttonInactiveVariant : buttonVariant}
                  size="icon"
                  onClick={() => onTogglePanel(panel.id)}
                  aria-label={`Toggle ${panel.title}`}
                />
              }
            >
              <PanelIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{panel.title}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
