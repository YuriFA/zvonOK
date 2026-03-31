import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  isParticipantsVisible: boolean;
  onToggleParticipants: () => void;
}

export const RoomRightControls = ({
  className,
  size = "icon",
  variant = "outline",
  isParticipantsVisible,
  onToggleParticipants,
}: Props) => {
  return (
    <div className={cn("flex gap-2", className)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant={isParticipantsVisible ? "secondary" : variant}
              size={size}
              onClick={onToggleParticipants}
              aria-label="Toggle participants"
            />
          }
        >
          <Users className="size-4" />
        </TooltipTrigger>
        <TooltipContent>Participants</TooltipContent>
      </Tooltip>
    </div>
  );
};
