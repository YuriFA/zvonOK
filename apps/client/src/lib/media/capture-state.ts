export const CaptureState = {
  STOPPED: 0,
  STARTING: 1,
  ACTIVE: 2,
  MUTED: 3,
  DEVICE_ERROR: 4,
  NO_DEVICE: 5,
  DEVICE_IN_USE: 6,
  DEVICE_NOT_FOUND: 7,
  SYSTEM_DENIED: 8,
  CAPTURE_CANCELED: 9,
} as const;

export type CaptureState = (typeof CaptureState)[keyof typeof CaptureState];

export function isActive(state: CaptureState): boolean {
  return state === CaptureState.ACTIVE || state === CaptureState.MUTED;
}

export function isError(state: CaptureState): boolean {
  return (
    state === CaptureState.DEVICE_ERROR ||
    state === CaptureState.NO_DEVICE ||
    state === CaptureState.DEVICE_IN_USE ||
    state === CaptureState.DEVICE_NOT_FOUND ||
    state === CaptureState.SYSTEM_DENIED
  );
}

export function canToggle(state: CaptureState): boolean {
  return (
    state === CaptureState.STOPPED ||
    state === CaptureState.ACTIVE ||
    state === CaptureState.MUTED ||
    state === CaptureState.DEVICE_ERROR ||
    state === CaptureState.DEVICE_NOT_FOUND ||
    state === CaptureState.CAPTURE_CANCELED
  );
}

export function canRetry(state: CaptureState): boolean {
  return (
    state === CaptureState.DEVICE_NOT_FOUND ||
    state === CaptureState.DEVICE_ERROR ||
    state === CaptureState.CAPTURE_CANCELED
  );
}

export type CaptureStateDisplay = {
  variant: "default" | "warning" | "destructive";
  icon: "on" | "off" | "spinner" | "off-warning" | "off-error";
  tooltip: string;
  statusText: string | null;
};

export function getCaptureStateDisplay(
  state: CaptureState,
  kind: "video" | "audio",
): CaptureStateDisplay {
  const label = kind === "video" ? "Camera" : "Microphone";

  switch (state) {
    case CaptureState.ACTIVE:
      return {
        variant: "default",
        icon: "on",
        tooltip: `Turn off ${label.toLowerCase()}`,
        statusText: null,
      };
    case CaptureState.STOPPED:
    case CaptureState.MUTED:
    case CaptureState.CAPTURE_CANCELED:
      return {
        variant: "default",
        icon: "off",
        tooltip: `Turn on ${label.toLowerCase()}`,
        statusText: null,
      };
    case CaptureState.STARTING:
      return {
        variant: "default",
        icon: "spinner",
        tooltip: `${label} starting...`,
        statusText: "Starting...",
      };
    case CaptureState.DEVICE_NOT_FOUND:
      return {
        variant: "warning",
        icon: "off-warning",
        tooltip: `${label} blocked. You can turn on in browser settings`,
        statusText: "Blocked",
      };
    case CaptureState.SYSTEM_DENIED:
      return {
        variant: "destructive",
        icon: "off-error",
        tooltip: `${label} blocked in system settings`,
        statusText: "Blocked in system settings",
      };
    case CaptureState.DEVICE_IN_USE:
      return {
        variant: "warning",
        icon: "off",
        tooltip: `${label} in use by another app`,
        statusText: "In use by another app",
      };
    case CaptureState.NO_DEVICE:
      return {
        variant: "warning",
        icon: "off",
        tooltip: `No ${label.toLowerCase()} found`,
        statusText: "No device found",
      };
    case CaptureState.DEVICE_ERROR:
      return {
        variant: "warning",
        icon: "off-warning",
        tooltip: `${label} unavailable`,
        statusText: "Device unavailable",
      };
    default:
      return { variant: "default", icon: "off", tooltip: `${label} off`, statusText: null };
  }
}
