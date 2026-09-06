import { Circle, Loader2, Monitor, MonitorOff, PhoneOff, Square } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { LocalRecorderState } from "@/features/media/hooks/use-local-recorder";
import { cn } from "@/lib/utils";

interface Props {
  isScreenSharing: boolean;
  isScreenShareSupported: boolean;
  isScreenShareBlocked: boolean;
  screenShareState: "idle" | "starting" | "sharing";
  onToggleScreenShare: () => Promise<void>;
  recordingState: LocalRecorderState;
  elapsedSeconds: number;
  isRecordingSupported: boolean;
  isRecordingEnabled: boolean;
  onToggleRecord: () => void;
  className?: string;
  buttonVariant?: ButtonProps["variant"];
  buttonInactiveVariant?: ButtonProps["variant"];
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function RoomCenterControls({
  buttonVariant = "outline",
  buttonInactiveVariant = "secondary",
  isScreenSharing,
  isScreenShareSupported,
  isScreenShareBlocked,
  screenShareState,
  onToggleScreenShare,
  recordingState,
  elapsedSeconds,
  isRecordingSupported,
  isRecordingEnabled,
  onToggleRecord,
  className,
}: Props) {
  const screenShareTooltip = isScreenSharing
    ? "Stop screen share"
    : isScreenShareBlocked
      ? "Another participant is sharing their screen"
      : "Share screen";
  const isScreenShareLoading = screenShareState === "starting";
  const isScreenShareDisabled = isScreenShareLoading || (isScreenShareBlocked && !isScreenSharing);
  const isRecording = recordingState === "recording";
  const recordTooltip = isRecording
    ? "Stop recording - saves a .webm to your device"
    : "Start recording";
  const isRecordingDisabled = recordingState === "saving" || !isRecordingEnabled;

  return (
    <div className={cn("flex gap-2", className)}>
      {isScreenShareSupported && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant={isScreenSharing ? buttonInactiveVariant : buttonVariant}
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

      {isRecordingSupported && (
        <>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={isRecording ? buttonInactiveVariant : buttonVariant}
                  className="relative"
                  size="icon"
                  onClick={onToggleRecord}
                  disabled={isRecordingDisabled}
                  aria-label={recordTooltip}
                  aria-pressed={isRecording}
                />
              }
            >
              {isRecording ? (
                <Square className="size-4 text-red-500" />
              ) : (
                <Circle className="size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent>{recordTooltip}</TooltipContent>
          </Tooltip>
          {isRecording && (
            <span className="text-sm font-medium text-red-500 tabular-nums">
              {formatElapsed(elapsedSeconds)}
            </span>
          )}
        </>
      )}
      <LinkButton to="/" variant="destructive" size="icon" aria-label="Leave room">
        <PhoneOff className="size-4" />
      </LinkButton>
    </div>
  );
}
