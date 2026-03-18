import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface PermissionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deniedDevices: {
    camera: boolean;
    microphone: boolean;
  };
  onRequestPermission: (kind: 'camera' | 'microphone' | 'both') => Promise<boolean>;
}

function getTitle(camera: boolean, microphone: boolean): string {
  if (camera && microphone) return 'Device Access Required';
  if (camera) return 'Camera Access Required';
  return 'Microphone Access Required';
}

function getDescription(camera: boolean, microphone: boolean): string {
  if (camera && microphone) {
    return 'Your browser is blocking access to the camera and microphone. To use these devices, you need to grant permission.';
  }
  if (camera) {
    return 'Your browser is blocking access to the camera. To use this device, you need to grant permission.';
  }
  return 'Your browser is blocking access to the microphone. To use this device, you need to grant permission.';
}

export function PermissionRequestModal({
  open,
  onOpenChange,
  deniedDevices,
  onRequestPermission,
}: PermissionRequestModalProps) {
  const [requesting, setRequesting] = useState(false);
  const [showDeniedMessage, setShowDeniedMessage] = useState(false);

  const { camera, microphone } = deniedDevices;
  const bothDenied = camera && microphone;

  const handleRequest = async (kind: 'camera' | 'microphone' | 'both') => {
    setRequesting(true);
    setShowDeniedMessage(false);

    const success = await onRequestPermission(kind);

    setRequesting(false);

    if (success) {
      setShowDeniedMessage(false);
      onOpenChange(false);
    } else {
      setShowDeniedMessage(true);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setShowDeniedMessage(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <AlertTriangle className="size-10 text-amber-500" />
          </div>
          <DialogTitle className="text-center">
            {getTitle(camera, microphone)}
          </DialogTitle>
          <DialogDescription className="text-center">
            {getDescription(camera, microphone)}
          </DialogDescription>
        </DialogHeader>

        {showDeniedMessage && (
          <p className="rounded-md bg-destructive/15 p-3 text-sm text-destructive text-center">
            Permission was denied again. You may need to update your browser's
            site settings to allow access to this device.
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {camera && (
            <Button
              onClick={() => handleRequest('camera')}
              disabled={requesting}
              className="w-full"
            >
              Allow Camera Access
            </Button>
          )}
          {microphone && (
            <Button
              onClick={() => handleRequest('microphone')}
              disabled={requesting}
              className="w-full"
            >
              Allow Microphone Access
            </Button>
          )}
          {bothDenied && (
            <Button
              onClick={() => handleRequest('both')}
              disabled={requesting}
              variant="secondary"
              className="w-full"
            >
              Allow Both
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
