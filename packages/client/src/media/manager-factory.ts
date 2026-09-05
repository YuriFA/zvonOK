import { MediaDeviceService } from "./device-service";
import { DefaultErrorClassifier } from "./error-classifier";
import type { IMediaManager } from "./interfaces";
import { MediaStreamManager } from "./manager";

export function createMediaManager(): IMediaManager {
  const deviceService = new MediaDeviceService();
  const errorClassifier = new DefaultErrorClassifier();

  return new MediaStreamManager({ deviceService, errorClassifier });
}
