import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deniedDevices: {
    camera: boolean;
    microphone: boolean;
  };
}

export function PermissionRequestModal({
  open,
  onOpenChange,
  deniedDevices,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <AlertTriangle className="size-10 text-amber-500" />
          </div>
          <DialogTitle className="text-center">
            {getTitle(deniedDevices.camera, deniedDevices.microphone)}
          </DialogTitle>
          <DialogDescription className="text-center">
            {getDescription(deniedDevices.camera, deniedDevices.microphone)}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
