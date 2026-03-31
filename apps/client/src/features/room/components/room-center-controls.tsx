import { Video, VideoOff, Mic, MicOff, AlertTriangle, Loader2, PhoneOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CaptureState, getCaptureStateDisplay } from "@/lib/media/capture-state";
import { cn } from "@/lib/utils";

interface Props {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  videoCaptureState: CaptureState;
  audioCaptureState: CaptureState;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  className?: string;
}

export function RoomCenterControls({
  isVideoEnabled,
  isAudioEnabled,
  videoCaptureState,
  audioCaptureState,
  onToggleVideo,
  onToggleAudio,
  className,
}: Props) {
  const videoDisplay = getCaptureStateDisplay(videoCaptureState, "video");
  const audioDisplay = getCaptureStateDisplay(audioCaptureState, "audio");

  return (
    <div className={cn("flex gap-2", className)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="relative"
              size="icon"
              onClick={onToggleVideo}
              aria-label={videoDisplay.tooltip}
            />
          }
        >
          {videoDisplay.status === "error" && (
            <Badge className="absolute -top-2 -right-1 size-5" variant="destructive">
              <AlertTriangle className="size-3" />
            </Badge>
          )}
          {videoDisplay.status === "loading" && (
            <Badge className="absolute -top-2 -right-1 size-5" variant="secondary">
              <Loader2 className="size-3 animate-spin" />
            </Badge>
          )}
          {isVideoEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
        </TooltipTrigger>
        <TooltipContent>{videoDisplay.tooltip}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="relative"
              size="icon"
              onClick={onToggleAudio}
              aria-label={audioDisplay.tooltip}
            />
          }
        >
          {audioDisplay.status === "error" && (
            <Badge className="absolute -top-2 -right-1 size-5" variant="destructive">
              <AlertTriangle className="size-3" />
            </Badge>
          )}
          {audioDisplay.status === "loading" && (
            <Badge className="absolute -top-2 -right-1 size-5" variant="secondary">
              <Loader2 className="size-3 animate-spin" />
            </Badge>
          )}
          {isAudioEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </TooltipTrigger>
        <TooltipContent>{audioDisplay.tooltip}</TooltipContent>
      </Tooltip>

      <LinkButton to="/" variant="destructive" size="icon" className="ml-2" aria-label="Leave room">
        <PhoneOff className="size-4" />
      </LinkButton>
    </div>
  );
}
