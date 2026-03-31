import { CaptureState } from "./capture-state";

export interface ErrorClassification {
  state: CaptureState;
  recoverable: boolean;
  reason: string;
}

export interface IErrorClassifier {
  classify(error: unknown, kind: "video" | "audio"): ErrorClassification;
}

export class DefaultErrorClassifier implements IErrorClassifier {
  classify(error: unknown, kind: "video" | "audio"): ErrorClassification {
    const label = kind === "video" ? "camera" : "microphone";

    if (error instanceof DOMException) {
      switch (error.name) {
        case "NotAllowedError":
          if (error.message.toLowerCase().includes("system")) {
            return {
              state: CaptureState.SYSTEM_DENIED,
              recoverable: false,
              reason: `Check system settings for ${label} access`,
            };
          }
          return {
            state: CaptureState.DEVICE_NOT_FOUND,
            recoverable: true,
            reason: `${label.charAt(0).toUpperCase() + label.slice(1)} blocked. Click to retry.`,
          };
        case "NotFoundError":
          return {
            state: CaptureState.DEVICE_NOT_FOUND,
            recoverable: true,
            reason: `No ${label} device found`,
          };
        case "NotReadableError":
          return {
            state: CaptureState.DEVICE_IN_USE,
            recoverable: true,
            reason: `${label.charAt(0).toUpperCase() + label.slice(1)} in use by another app`,
          };
        case "OverconstrainedError":
          return {
            state: CaptureState.DEVICE_ERROR,
            recoverable: true,
            reason: `${label.charAt(0).toUpperCase() + label.slice(1)} device unavailable`,
          };
      }
    }

    if (error instanceof Error && error.name === "AbortError") {
      return {
        state: CaptureState.CAPTURE_CANCELED,
        recoverable: true,
        reason: `${label} capture canceled`,
      };
    }

    return {
      state: CaptureState.DEVICE_ERROR,
      recoverable: false,
      reason: `${label.charAt(0).toUpperCase() + label.slice(1)} device error`,
    };
  }
}
