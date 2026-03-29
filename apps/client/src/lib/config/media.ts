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

