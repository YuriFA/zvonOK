export interface IMediaDeviceService {
  getUserMedia: typeof navigator.mediaDevices.getUserMedia;
  enumerateDevices: typeof navigator.mediaDevices.enumerateDevices;
  queryPermission(kind: "video" | "audio"): Promise<PermissionStatus>;
}

export class MediaDeviceService implements IMediaDeviceService {
  async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices.enumerateDevices();
  }

  async queryPermission(kind: "video" | "audio"): Promise<PermissionStatus> {
    const name = kind === "video" ? "camera" : "microphone";
    return navigator.permissions.query({ name: name as PermissionName });
  }
}
