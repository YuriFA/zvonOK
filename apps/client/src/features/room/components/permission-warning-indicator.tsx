import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PermissionWarningIndicatorProps {
  isCameraDenied: boolean;
  isMicrophoneDenied: boolean;
  onClick: () => void;
}

function getTooltipText(camera: boolean, microphone: boolean): string {
  if (camera && microphone) return 'Camera and microphone access blocked';
  if (camera) return 'Camera access blocked';
  return 'Microphone access blocked';
}

export function PermissionWarningIndicator({
  isCameraDenied,
  isMicrophoneDenied,
  onClick,
}: PermissionWarningIndicatorProps) {
  if (!isCameraDenied && !isMicrophoneDenied) return null;

  const tooltipText = getTooltipText(isCameraDenied, isMicrophoneDenied);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            aria-label={tooltipText}
          />
        }
      >
        <AlertTriangle className="size-4 text-amber-500" />
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
