import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  AlertTriangle,
  Loader2,
  PhoneOff,
  Monitor,
  MonitorOff,
} from "lucide-react";

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
  isScreenSharing: boolean;
  isScreenShareSupported: boolean;
  isScreenShareBlocked: boolean;
  screenShareState: "idle" | "starting" | "sharing";
  onToggleScreenShare: () => Promise<void>;
  className?: string;
}

export function RoomCenterControls({
  isVideoEnabled,
  isAudioEnabled,
  videoCaptureState,
  audioCaptureState,
  onToggleVideo,
  onToggleAudio,
  isScreenSharing,
  isScreenShareSupported,
  isScreenShareBlocked,
  screenShareState,
  onToggleScreenShare,
  className,
}: Props) {
  const videoDisplay = getCaptureStateDisplay(videoCaptureState, "video");
  const audioDisplay = getCaptureStateDisplay(audioCaptureState, "audio");

  const screenShareTooltip = isScreenSharing
    ? "Stop screen share"
    : isScreenShareBlocked
      ? "Another participant is sharing their screen"
      : "Share screen";
  const isScreenShareLoading = screenShareState === "starting";
  const isScreenShareDisabled = isScreenShareLoading || (isScreenShareBlocked && !isScreenSharing);

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

      {isScreenShareSupported && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant={isScreenSharing ? "secondary" : "outline"}
                className="relative"
                size="icon"
                onClick={() => void onToggleScreenShare()}
                disabled={isScreenShareDisabled}
                aria-label={screenShareTooltip}
                aria-pressed={isScreenSharing}
              />
            }
          >
            {isScreenShareLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isScreenSharing ? (
              <MonitorOff className="size-4" />
            ) : (
              <Monitor className="size-4" />
            )}
          </TooltipTrigger>
          <TooltipContent>{screenShareTooltip}</TooltipContent>
        </Tooltip>
      )}

      <LinkButton to="/" variant="destructive" size="icon" className="ml-2" aria-label="Leave room">
        <PhoneOff className="size-4" />
      </LinkButton>
    </div>
  );
}
