const PREFIX = "webrtc_chat_";

export const STORAGE_KEYS = {
  SELECTED_DEVICES: `${PREFIX}selected_devices`,
  SELECTED_CAMERA_ID: `${PREFIX}selected_camera_id`,
  SELECTED_MIC_ID: `${PREFIX}selected_mic_id`,
  SELECTED_SPEAKER_ID: `${PREFIX}selected_speaker_id`,
  MIC_ENABLED: `${PREFIX}mic_enabled`,
  CAMERA_ENABLED: `${PREFIX}camera_enabled`,
} as const;
