export const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { min: 640, ideal: 1280, max: 1920 },
  height: { min: 480, ideal: 720, max: 1080 },
  facingMode: 'user',
};

export const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  video: DEFAULT_VIDEO_CONSTRAINTS,
  audio: DEFAULT_AUDIO_CONSTRAINTS,
};

export const VIDEO_RESOLUTIONS = {
  VGA: { width: 640, height: 480 },
  HD: { width: 1280, height: 720 },
  FULL_HD: { width: 1920, height: 1080 },
} as const;
