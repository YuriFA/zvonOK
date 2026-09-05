import { MediaDeviceService } from "./device-service.js";
import { DefaultErrorClassifier } from "./error-classifier.js";
import type { IMediaManager } from "./interfaces.js";
import { MediaStreamManager } from "./manager.js";

export function createMediaManager(): IMediaManager {
  const deviceService = new MediaDeviceService();
  const errorClassifier = new DefaultErrorClassifier();

  return new MediaStreamManager({ deviceService, errorClassifier });
}
