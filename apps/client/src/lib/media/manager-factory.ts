import type { IMediaDeviceService } from './device-service';
import type { IErrorClassifier } from './error-classifier';
import { MediaDeviceService } from './device-service';
import { DefaultErrorClassifier } from './error-classifier';
import type { IMediaManager } from './interfaces';
import { MediaStreamManager } from './manager';

export function createMediaManager(deps?: {
  deviceService?: IMediaDeviceService;
  errorClassifier?: IErrorClassifier;
}): IMediaManager {
  const deviceService = deps?.deviceService ?? new MediaDeviceService();
  const errorClassifier = deps?.errorClassifier ?? new DefaultErrorClassifier();
  return new MediaStreamManager({ deviceService, errorClassifier });
}
